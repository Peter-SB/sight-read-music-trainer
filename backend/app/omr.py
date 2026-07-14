"""Optical music recognition: turn an uploaded PDF/image into a MusicXML file.

Thin wrapper around the `oemer` OMR engine. oemer works on a single-page raster
image and writes a `<name>.musicxml` next to it, so for PDFs we first rasterise
page 1 with PyMuPDF (a pure-wheel dependency — no poppler binary needed on
Windows). This is a POC: we only ever transcribe the first page.
"""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
import sysconfig
import time
from functools import lru_cache
from pathlib import Path

import fitz  # PyMuPDF

from .logging_config import Timer, get_logger

logger = get_logger("omr")

# Raster DPI for PDF pages. 300 is a good balance for OMR without huge images.
PDF_RENDER_DPI = 300

IMAGE_SUFFIXES = {".png", ".jpg", ".jpeg", ".bmp", ".tiff", ".tif"}


@lru_cache(maxsize=1)
def _cuda_dll_dirs() -> tuple[str, ...]:
    """Locate the CUDA/cuDNN DLL directories from the installed `nvidia-*` wheels.

    oemer requests the ONNX Runtime CUDA execution provider (falling back to CPU),
    but because we run oemer as a *subprocess* we can't use ORT's in-process
    `preload_dlls()`. Instead we find the `site-packages/nvidia/<lib>/bin`
    directories the wheels ship and prepend them to the subprocess PATH so
    Windows resolves cublasLt64_12.dll, cudnn64_9.dll, etc. Returns () if the GPU
    wheels aren't installed (→ oemer runs on CPU).
    """
    site = Path(sysconfig.get_paths()["purelib"])
    nvidia = site / "nvidia"
    if not nvidia.is_dir():
        return ()
    dirs = [str(p) for p in sorted(nvidia.glob("*/bin")) if p.is_dir()]
    return tuple(dirs)


def log_gpu_diagnostics() -> None:
    """Log GPU/CUDA availability at startup so the logs show acceleration status.

    Best-effort: any failure is downgraded to a warning — the server still works
    on CPU.
    """
    dll_dirs = _cuda_dll_dirs()
    logger.info("CUDA DLL wheel dirs found: %d", len(dll_dirs))
    try:
        import onnxruntime as ort

        # preload_dlls loads the nvidia-wheel CUDA libs into THIS process so the
        # availability check below reflects what a session could actually use.
        try:
            ort.preload_dlls()
        except Exception:  # noqa: BLE001 - older ORT or no wheels
            pass
        providers = ort.get_available_providers()
        cuda_ok = "CUDAExecutionProvider" in providers
        logger.info(
            "onnxruntime %s providers=%s (CUDA %s)",
            ort.__version__,
            providers,
            "available" if cuda_ok else "unavailable",
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("could not query onnxruntime GPU status: %s", exc)


def _subprocess_env() -> dict[str, str]:
    """Environment for the oemer subprocess, with CUDA DLL dirs on PATH if GPU is on.

    Controlled by the OMR_USE_GPU env var: "auto"/"1"/"true" (default) injects the
    CUDA DLL dirs when present; "0"/"false" forces CPU by leaving them off PATH.
    """
    env = os.environ.copy()
    use_gpu = os.getenv("OMR_USE_GPU", "auto").lower() not in {"0", "false", "off", "no"}
    if not use_gpu:
        logger.info("OMR_USE_GPU disabled; oemer will run on CPU")
        return env

    dll_dirs = _cuda_dll_dirs()
    if not dll_dirs:
        logger.info("no CUDA wheels found; oemer will run on CPU")
        return env

    env["PATH"] = os.pathsep.join((*dll_dirs, env.get("PATH", "")))
    logger.info("GPU enabled: injected %d CUDA DLL dir(s) into subprocess PATH", len(dll_dirs))
    logger.debug("CUDA DLL dirs: %s", dll_dirs)
    return env


class OmrError(RuntimeError):
    """Raised when transcription fails for a reason worth showing the user."""


def _pdf_first_page_to_png(pdf_path: Path, out_dir: Path) -> Path:
    """Render page 1 of a PDF to a PNG and return its path."""
    with Timer(logger, f"rasterise PDF page 1 @ {PDF_RENDER_DPI} DPI"):
        try:
            doc = fitz.open(pdf_path)
        except Exception as exc:  # noqa: BLE001 - corrupt/unreadable PDF
            raise OmrError(f"Could not open the PDF: {exc}") from exc
        try:
            if doc.page_count == 0:
                raise OmrError("The PDF has no pages.")
            logger.debug("PDF has %d page(s); rendering page 1", doc.page_count)
            page = doc.load_page(0)
            pix = page.get_pixmap(dpi=PDF_RENDER_DPI)
            png_path = out_dir / "page1.png"
            pix.save(png_path)
            logger.info(
                "rendered page 1 -> %s (%dx%d px)", png_path.name, pix.width, pix.height
            )
            return png_path
        finally:
            doc.close()


def _oemer_command(image_path: Path, out_dir: Path) -> list[str]:
    """Build the oemer invocation.

    oemer ships a console script (`oemer = oemer.ete:main`) rather than a
    `__main__`, so `python -m oemer` may not work. Prefer the console script
    sitting alongside the current interpreter (same venv); fall back to the
    module form and finally a bare `oemer` on PATH.
    """
    scripts_dir = Path(sys.executable).parent
    for name in ("oemer.exe", "oemer"):
        candidate = scripts_dir / name
        if candidate.exists():
            return [str(candidate), str(image_path), "-o", str(out_dir)]
    if shutil.which("oemer"):
        return ["oemer", str(image_path), "-o", str(out_dir)]
    return [sys.executable, "-m", "oemer", str(image_path), "-o", str(out_dir)]


def _run_oemer(image_path: Path, out_dir: Path) -> Path:
    """Run the oemer CLI on an image and return the produced .musicxml path."""
    cmd = _oemer_command(image_path, out_dir)
    logger.info("invoking oemer: %s", " ".join(cmd))
    started = time.perf_counter()
    try:
        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=900,  # OMR + first-run model download can be very slow.
            env=_subprocess_env(),
        )
    except FileNotFoundError as exc:  # pragma: no cover - env issue
        logger.error("oemer executable not found for command: %s", cmd)
        raise OmrError("oemer is not installed in this environment.") from exc
    except subprocess.TimeoutExpired as exc:
        elapsed_ms = (time.perf_counter() - started) * 1000
        logger.error("oemer timed out after %.1f ms", elapsed_ms)
        raise OmrError("Transcription timed out.") from exc

    elapsed_ms = (time.perf_counter() - started) * 1000
    if proc.returncode != 0:
        detail = (proc.stderr or proc.stdout or "").strip()[-800:]
        logger.error(
            "oemer exited %d after %.1f ms. Tail:\n%s",
            proc.returncode,
            elapsed_ms,
            detail,
        )
        raise OmrError(f"oemer failed:\n{detail}")

    # Report which ONNX Runtime execution provider oemer actually used: it logs a
    # warning to stderr when the CUDA provider can't load and it falls back to CPU.
    if "Failed to create CUDAExecutionProvider" in (proc.stderr or ""):
        logger.warning("oemer fell back to CPU (CUDA provider failed to load)")
    else:
        logger.info("oemer ran with GPU acceleration (CUDA provider active)")

    logger.info("oemer succeeded in %.1f ms", elapsed_ms)
    produced = sorted(out_dir.glob("*.musicxml")) + sorted(out_dir.glob("*.xml"))
    if not produced:
        logger.error("oemer returned 0 but no MusicXML found in %s", out_dir)
        raise OmrError("oemer produced no MusicXML output.")
    logger.debug("oemer output file: %s", produced[0].name)
    return produced[0]


def transcribe_to_musicxml(source_path: Path, work_dir: Path) -> Path:
    """Transcribe a PDF or image file to a MusicXML file inside `work_dir`.

    Returns the path to the generated .musicxml. Raises OmrError on failure.
    """
    suffix = source_path.suffix.lower()
    logger.info("transcribe_to_musicxml: source=%s (%s)", source_path.name, suffix)

    if suffix == ".pdf":
        image_path = _pdf_first_page_to_png(source_path, work_dir)
    elif suffix in IMAGE_SUFFIXES:
        # Copy into the work dir so oemer's sidecar outputs land there.
        image_path = work_dir / f"input{suffix}"
        shutil.copyfile(source_path, image_path)
        logger.debug("copied image to work dir: %s", image_path.name)
    else:
        logger.warning("rejected unsupported file type: %s", suffix)
        raise OmrError(
            f"Unsupported file type '{suffix}'. Upload a PDF or image."
        )

    return _run_oemer(image_path, work_dir)
