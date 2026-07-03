import type { NoteReading } from './types'

/**
 * Maps a detected frequency (concert pitch, Hz) to the nearest note plus its
 * cents deviation. Pure and framework-agnostic — the highest-value test surface
 * alongside {@link transposition}.
 */

/** Reference pitch for A4. Standard concert tuning. */
export const A4_HZ = 440

/** MIDI note number of A4. */
const A4_MIDI = 69

/**
 * Accidentals spelled as flats so names line up with the fingering-chart file
 * naming convention (e.g. "Bb3"). Index = pitch class (0 = C).
 */
const PITCH_CLASSES = [
  'C',
  'Db',
  'D',
  'Eb',
  'E',
  'F',
  'Gb',
  'G',
  'Ab',
  'A',
  'Bb',
  'B',
] as const

/** Below this Pitchy clarity we treat the frame as "no reliable reading". */
export const DEFAULT_MIN_CLARITY = 0.9

export interface ToNoteOptions {
  /** Reject readings below this clarity (0–1). Defaults to {@link DEFAULT_MIN_CLARITY}. */
  minClarity?: number
  /** Reference frequency for A4. Defaults to {@link A4_HZ}. */
  a4Hz?: number
}

/**
 * Convert a frequency to the exact (fractional) MIDI note number.
 * Exposed for testing and for callers that want sub-semitone precision.
 */
export function hzToMidi(hz: number, a4Hz: number = A4_HZ): number {
  return A4_MIDI + 12 * Math.log2(hz / a4Hz)
}

/** Convert a (possibly fractional) MIDI note number back to frequency. */
export function midiToHz(midi: number, a4Hz: number = A4_HZ): number {
  return a4Hz * 2 ** ((midi - A4_MIDI) / 12)
}

/**
 * Widest calibration offset the UI allows, in cents. 100¢ = a full semitone —
 * enough to cover badly-transposing setups. (At offsets past ±50¢ the reference
 * shift can start pulling a played note toward the neighbouring semitone during
 * normal use; that's the trade-off for the wider range.)
 */
export const MAX_CALIBRATION_CENTS = 100

/**
 * Reference A4 (Hz) to feed {@link toNote}/{@link hzToMidi} to correct for a
 * mic/interface that consistently reads a little sharp or flat. `offsetCents`
 * is user-facing and small (±{@link MAX_CALIBRATION_CENTS}) — positive shifts
 * readings sharper, negative flatter — implemented as a shift of the analysis
 * reference pitch rather than a post-hoc add to `cents`, so it also nudges
 * which note counts as "nearest" consistently instead of just the display.
 */
export function calibratedA4Hz(offsetCents: number, baseA4Hz: number = A4_HZ): number {
  return baseA4Hz * 2 ** (-offsetCents / 1200)
}

/** Build a note name like "Bb3" from an integer MIDI note number. */
export function midiToNoteName(midi: number): string {
  const { pitchClass, octave } = midiToParts(midi)
  return `${pitchClass}${octave}`
}

function midiToParts(midi: number): { pitchClass: string; octave: number } {
  // Positive modulo so negative MIDI numbers still index correctly.
  const pc = ((midi % 12) + 12) % 12
  const octave = Math.floor(midi / 12) - 1
  return { pitchClass: PITCH_CLASSES[pc], octave }
}

/** Flat spellings, as produced by {@link midiToNoteName}, mapped to their sharp equivalent. */
const FLAT_TO_SHARP: Record<string, string> = {
  Db: 'C#',
  Eb: 'D#',
  Gb: 'F#',
  Ab: 'G#',
  Bb: 'A#',
}

/**
 * Render a note name for display with sharps rather than flats (e.g. "Gb4" ->
 * "F#4"), using a proper ♯ glyph. Internal note names stay flat-spelled to
 * match the fingering-chart data; this is purely a display-layer concern.
 */
export function formatNoteNameForDisplay(noteName: string): string {
  const match = /^([A-Ga-g][b#]?)(-?\d+)$/.exec(noteName)
  if (!match) return noteName
  const [, pitchClass, octave] = match
  const sharpPitchClass = FLAT_TO_SHARP[pitchClass] ?? pitchClass
  return `${sharpPitchClass}${octave}`.replace('#', '♯')
}

/**
 * Semitone offset from C for every accepted pitch-class spelling. Accepts both
 * flats and sharps (and unicode ♭/♯) so callers aren't locked to one spelling.
 */
const PITCH_CLASS_TO_SEMITONE: Record<string, number> = {
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
}

/**
 * Parse a scientific note name like "Bb3", "F#4" or "C-1" into a MIDI number.
 * Returns `null` for unparseable input.
 */
export function noteNameToMidi(noteName: string): number | null {
  const match = /^([A-Ga-g])([#b♯♭]?)(-?\d+)$/.exec(noteName.trim())
  if (!match) return null

  const [, letter, rawAccidental, octaveStr] = match
  const accidental = rawAccidental.replace('♯', '#').replace('♭', 'b')
  const semitone = PITCH_CLASS_TO_SEMITONE[letter.toUpperCase() + accidental]
  if (semitone === undefined) return null

  const octave = Number.parseInt(octaveStr, 10)
  return (octave + 1) * 12 + semitone
}

/**
 * Resolve a frequency to the nearest note in concert pitch.
 *
 * Returns `null` (rather than a guessed note) when the frequency is invalid or
 * the clarity is too low, so callers don't render flickering false readings.
 */
export function toNote(
  hz: number,
  clarity: number,
  options: ToNoteOptions = {},
): NoteReading | null {
  const { minClarity = DEFAULT_MIN_CLARITY, a4Hz = A4_HZ } = options

  if (!Number.isFinite(hz) || hz <= 0) return null
  if (!Number.isFinite(clarity) || clarity < minClarity) return null

  const exactMidi = hzToMidi(hz, a4Hz)
  const midi = Math.round(exactMidi)
  const cents = Math.round((exactMidi - midi) * 100)
  const { pitchClass, octave } = midiToParts(midi)

  return {
    noteName: `${pitchClass}${octave}`,
    pitchClass,
    octave,
    midi,
    cents,
    clarity,
  }
}
