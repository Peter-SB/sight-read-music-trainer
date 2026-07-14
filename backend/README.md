# Sight-Read OMR Backend

A small FastAPI service that transcribes an uploaded sheet-music PDF/image into a
key signature + ordered note list using the [oemer](https://github.com/BreezeWhite/oemer)
optical-music-recognition engine. Timing/rhythm is intentionally discarded — the
frontend only needs the sequence of notes.

The frontend works **without** this backend running: the "Learn sheet music"
screen loads and shows a "backend unavailable" state, disabling upload only.

## Setup

Python 3.10+ recommended.

```bash
cd backend
python -m venv .venv
# Windows PowerShell:  .venv\Scripts\Activate.ps1
# Git Bash / macOS:    source .venv/bin/activate
pip install -r requirements.txt
```

> **First run downloads models.** oemer fetches its ONNX checkpoints (~hundreds of
> MB) the first time it transcribes. That request will be slow; subsequent ones
> are fast. If it fails to download, run `oemer <some-image>` once manually to
> prime the cache.

### GPU acceleration (optional, NVIDIA/CUDA)

oemer runs OMR inference through ONNX Runtime. To use an NVIDIA GPU, also
install the GPU requirements:

```bash
pip install -r requirements.txt -r requirements-gpu.txt
```

This pins the CUDA-12 `onnxruntime-gpu` build and the matching NVIDIA runtime +
cuDNN 9 wheels; `app/omr.py` puts their DLLs on the oemer subprocess PATH
automatically. On startup the log reports GPU status, e.g.
`onnxruntime 1.22.0 providers=[... 'CUDAExecutionProvider' ...] (CUDA available)`,
and each transcription logs whether it used the GPU or fell back to CPU.

Toggle with `OMR_USE_GPU` (default on; set `OMR_USE_GPU=0` to force CPU). On an
RTX 3060 Ti this roughly halved transcription time (~234 s → ~123 s); the
remainder is oemer's CPU-bound symbol post-processing, which the GPU doesn't
accelerate.

## Run

```bash
uvicorn app.main:app --reload --port 8010
```

Logs are millisecond-timestamped so per-stage durations can be analysed (OMR
takes minutes per sheet). Set the level with `OMR_LOG_LEVEL` (default `INFO`;
use `DEBUG` for verbose stage tracing):

```bash
OMR_LOG_LEVEL=DEBUG uvicorn app.main:app --port 8010
```

## Endpoints

- `GET /health` → `{ "status": "ok" }`
- `POST /transcribe` (multipart form):
  - `file`: PDF or image (png/jpg/…). PDFs: only page 1 is transcribed (POC).
  - `instrument`: what the sheet is written for — `concert`, `alto_sax`,
    `tenor_sax`, `soprano_sax`, `bari_sax`. Echoed back; the frontend applies the
    transposition to concert pitch.
  - Returns `{ "instrument": str, "key": str, "notes": ["C#4", "E4", ...] }`

## Quick test

```bash
curl -F "file=@tests/test_data/pink_panther_sheet_music_alto_sax.png" \
     -F "instrument=alto_sax" \
     http://localhost:8010/transcribe
```
