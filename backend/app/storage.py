"""Persistence for transcribed sheet music, for later re-access.

Each saved transcription keeps two files under DATA_DIR:
  <id>.musicxml  — the raw oemer output (music21 re-parses it fast if richer
                   data is ever needed).
  <id>.json      — cached metadata + the extracted note list, so listing and
                   re-opening are instant without re-parsing.

Deliberately file-based (no DB): this is a local single-user POC.
"""

from __future__ import annotations

import json
import shutil
import time
import uuid
from pathlib import Path

from .logging_config import get_logger

logger = get_logger("storage")

# backend/data/transcriptions/ (sibling of the `app` package's parent).
DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "transcriptions"


def _ensure_dir() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)


def save(
    *,
    name: str,
    instrument: str,
    key: str,
    notes: list[str],
    musicxml_path: Path,
) -> dict:
    """Persist a transcription and return its metadata record (incl. new id)."""
    _ensure_dir()
    item_id = uuid.uuid4().hex[:12]
    record = {
        "id": item_id,
        "name": name,
        "instrument": instrument,
        "key": key,
        "notes": notes,
        "note_count": len(notes),
        "created_at": time.time(),
    }
    (DATA_DIR / f"{item_id}.json").write_text(
        json.dumps(record), encoding="utf-8"
    )
    try:
        shutil.copyfile(musicxml_path, DATA_DIR / f"{item_id}.musicxml")
    except OSError:
        # The MusicXML copy is a nice-to-have; the cached JSON is the source of
        # truth for the app, so don't fail the save if the copy hiccups.
        logger.warning("could not copy MusicXML for %s", item_id, exc_info=True)
    logger.info("saved transcription %s (%s, %d notes)", item_id, name, len(notes))
    return record


def _summary(record: dict) -> dict:
    """List-view projection: everything except the (potentially long) note list."""
    return {k: v for k, v in record.items() if k != "notes"}


def list_all() -> list[dict]:
    """All saved transcriptions as summaries, newest first."""
    if not DATA_DIR.is_dir():
        return []
    records: list[dict] = []
    for path in DATA_DIR.glob("*.json"):
        try:
            records.append(json.loads(path.read_text(encoding="utf-8")))
        except (OSError, json.JSONDecodeError):
            logger.warning("skipping unreadable record %s", path.name, exc_info=True)
    records.sort(key=lambda r: r.get("created_at", 0), reverse=True)
    return [_summary(r) for r in records]


def get(item_id: str) -> dict | None:
    """Full record (including notes) for one transcription, or None if missing."""
    path = DATA_DIR / f"{_safe_id(item_id)}.json"
    if not path.is_file():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        logger.warning("unreadable record %s", path.name, exc_info=True)
        return None


def delete(item_id: str) -> bool:
    """Delete a transcription's files. Returns True if anything was removed."""
    safe = _safe_id(item_id)
    removed = False
    for suffix in (".json", ".musicxml"):
        path = DATA_DIR / f"{safe}{suffix}"
        if path.is_file():
            path.unlink()
            removed = True
    if removed:
        logger.info("deleted transcription %s", safe)
    return removed


def _safe_id(item_id: str) -> str:
    """Guard against path traversal — ids are hex, so keep only [0-9a-f]."""
    return "".join(c for c in item_id if c in "0123456789abcdef")
