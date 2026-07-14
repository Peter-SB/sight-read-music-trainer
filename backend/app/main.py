"""FastAPI service exposing sheet-music transcription for the trainer frontend.

Endpoints:
  GET  /health     -> liveness check the frontend uses to decide whether the
                      "Learn sheet music" transcription feature is available.
  POST /transcribe -> multipart upload of a PDF/image, returns the notated key
                      and an ordered note list (no timing).

The `instrument` field records which instrument the uploaded sheet is written
for (e.g. alto_sax, tenor_sax, concert). Transposition to concert pitch is done
on the frontend where the tested transposition utilities already live; the
backend just returns the notes exactly as printed and echoes the instrument
back so the client knows how to interpret them.
"""

from __future__ import annotations

import tempfile
import time
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from . import storage
from .logging_config import configure_logging, get_logger
from .musicxml_extract import extract
from .omr import OmrError, log_gpu_diagnostics, transcribe_to_musicxml

configure_logging()
logger = get_logger("api")
log_gpu_diagnostics()

app = FastAPI(title="Sight-Read OMR Backend")

# POC: allow the local Vite dev server. Tighten for any real deployment.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


# A plain `def` (not `async def`): transcription is blocking (subprocess + heavy
# CPU), so letting FastAPI run it in its threadpool keeps the event loop free to
# serve /health and other requests concurrently.
@app.post("/transcribe")
def transcribe(
    file: UploadFile = File(...),
    instrument: str = Form("concert"),
) -> dict:
    request_started = time.perf_counter()
    filename = file.filename or "upload"
    suffix = Path(filename).suffix or ".png"

    with tempfile.TemporaryDirectory(prefix="omr-") as tmp:
        tmp_dir = Path(tmp)
        source_path = tmp_dir / f"source{suffix}"
        data = file.file.read()
        source_path.write_bytes(data)
        logger.info(
            "POST /transcribe: file=%s (%d bytes), instrument=%s",
            filename,
            len(data),
            instrument,
        )

        try:
            musicxml_path = transcribe_to_musicxml(source_path, tmp_dir)
            result = extract(musicxml_path)
            # Persist while the temp MusicXML still exists (before the dir is cleaned).
            record = storage.save(
                name=filename,
                instrument=instrument,
                key=result["key"],
                notes=result["notes"],
                musicxml_path=musicxml_path,
            )
        except OmrError as exc:
            elapsed_ms = (time.perf_counter() - request_started) * 1000
            logger.warning(
                "transcription rejected after %.1f ms: %s", elapsed_ms, exc
            )
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        except Exception as exc:  # noqa: BLE001 - surface unexpected failures
            elapsed_ms = (time.perf_counter() - request_started) * 1000
            logger.error(
                "transcription failed after %.1f ms", elapsed_ms, exc_info=True
            )
            raise HTTPException(
                status_code=500, detail=f"Transcription error: {exc}"
            ) from exc

    total_ms = (time.perf_counter() - request_started) * 1000
    logger.info(
        "POST /transcribe done in %.1f ms: key=%s, %d notes",
        total_ms,
        result["key"],
        len(result["notes"]),
    )
    return {
        "id": record["id"],
        "instrument": instrument,
        "key": result["key"],
        "notes": result["notes"],
    }


@app.get("/transcriptions")
def list_transcriptions() -> list[dict]:
    """Summaries of all saved transcriptions, newest first."""
    return storage.list_all()


@app.get("/transcriptions/{item_id}")
def get_transcription(item_id: str) -> dict:
    """Full saved transcription (including its note list)."""
    record = storage.get(item_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Transcription not found.")
    return record


@app.delete("/transcriptions/{item_id}", status_code=204)
def delete_transcription(item_id: str) -> None:
    if not storage.delete(item_id):
        raise HTTPException(status_code=404, detail="Transcription not found.")
