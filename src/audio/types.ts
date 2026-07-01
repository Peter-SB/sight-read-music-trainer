/**
 * Shared audio-pipeline types.
 *
 * The pipeline is intentionally split into small, pure stages so the core
 * (note math + transposition) can be unit-tested with no mic or browser:
 *
 *   mic → PitchReading → NoteReading (concert) → displayed note (per instrument)
 */

/** Raw output of the pitch detector for a single analysis frame. */
export interface PitchReading {
  /** Fundamental frequency in Hz. */
  hz: number
  /** Detector confidence, 0–1 (Pitchy "clarity"). */
  clarity: number
  /** performance.now() timestamp when the frame was analysed. */
  timestamp: number
}

/** A frequency resolved to the nearest note, in concert pitch. */
export interface NoteReading {
  /** e.g. "A4", "Bb3" — concert pitch, flats used for accidentals. */
  noteName: string
  /** Pitch class letter+accidental without octave, e.g. "Bb". */
  pitchClass: string
  /** Octave number (scientific pitch notation; middle C = C4). */
  octave: number
  /** MIDI note number of the nearest note (A4 = 69). */
  midi: number
  /** Deviation from the nearest note in cents, -50..+50. */
  cents: number
  /** Carried through from the PitchReading that produced this. */
  clarity: number
}
