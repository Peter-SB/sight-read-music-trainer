"""Pull the key signature and an ordered note list out of a MusicXML file.

Deliberately drops all timing/duration/rhythm — the POC only cares about *which*
notes appear and *in what order*, matching the frontend's staff renderer that
takes a bare list of note names.
"""

from __future__ import annotations

from pathlib import Path

from music21 import chord, converter, key as m21key, note as m21note

from .logging_config import Timer, get_logger

logger = get_logger("extract")


def _key_name(score) -> str:
    """Best-effort key signature label, e.g. 'G major' or 'Eb'.

    Prefer an explicit KeySignature/Key printed on the sheet; fall back to
    music21's key analysis when none is notated.
    """
    for element in score.recurse().getElementsByClass(m21key.Key):
        logger.debug("key from explicit Key element: %s", element.name)
        return element.name  # e.g. "G major"

    for element in score.recurse().getElementsByClass(m21key.KeySignature):
        try:
            tonic = element.asKey().name
            if tonic:
                logger.debug("key from KeySignature: %s", tonic)
                return tonic
        except Exception:  # noqa: BLE001 - analysis is best-effort
            logger.warning("KeySignature.asKey() failed; trying analysis", exc_info=True)

    try:
        analysed = score.analyze("key").name
        logger.warning("no notated key found; analysed key as %s", analysed)
        return analysed
    except Exception:  # noqa: BLE001
        logger.error("key analysis failed; returning 'unknown'", exc_info=True)
        return "unknown"


def _note_names(score) -> list[str]:
    """Ordered list of note names (e.g. 'C#4'); chords collapse to their top note."""
    names: list[str] = []
    chords = 0
    for element in score.flatten().notes:
        if isinstance(element, m21note.Note):
            names.append(element.nameWithOctave)
        elif isinstance(element, chord.Chord) and element.pitches:
            # POC simplification: keep only the highest-sounding pitch.
            top = max(element.pitches, key=lambda p: p.midi)
            names.append(top.nameWithOctave)
            chords += 1
    if chords:
        logger.debug("collapsed %d chord(s) to their top note", chords)
    return names


def extract(musicxml_path: Path) -> dict:
    """Parse a MusicXML file into `{"key": str, "notes": list[str]}`."""
    with Timer(logger, "parse MusicXML"):
        try:
            score = converter.parse(str(musicxml_path))
        except Exception as exc:  # noqa: BLE001 - malformed OMR output
            logger.error("failed to parse MusicXML %s", musicxml_path, exc_info=True)
            raise

    key = _key_name(score)
    notes = _note_names(score)
    logger.info("extracted key=%s with %d note(s)", key, len(notes))
    return {"key": key, "notes": notes}
