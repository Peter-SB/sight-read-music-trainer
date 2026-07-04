/**
 * Pure geometry for placing notes on a five-line treble staff.
 *
 * A note's vertical position is *diatonic*: it depends only on its letter and
 * octave, never on the accidental (C4, C#4 and Cb4 all sit on the same line).
 * We express that as a "diatonic step" — a whole-tone-agnostic staff index —
 * and turn it into a y coordinate the {@link SheetMusic} SVG can draw with.
 *
 * No clef glyph or key signature is drawn yet; the staff is assumed treble,
 * so the reference points below are the treble-clef line pitches.
 */

/** Semitone-agnostic step within an octave, C = 0 … B = 6. */
const LETTER_STEP: Record<string, number> = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 }

export interface StaffNote {
  /** The name it was parsed from, e.g. "Bb3". */
  name: string
  letter: string
  /** Normalised to ASCII: '', '#' or 'b'. */
  accidental: '' | '#' | 'b'
  octave: number
  /**
   * Diatonic staff index: `octave * 7 + letterStep`. Increases upward by one
   * per line-or-space, so even/odd tells you line vs space (see below).
   */
  diatonicStep: number
}

/**
 * Treble-clef anchors, as diatonic steps.
 *   E4 (bottom line) = 4*7 + 2 = 30
 *   F5 (top line)    = 5*7 + 3 = 38
 * Every even step is a staff line, every odd step a space, so the five lines
 * fall on steps 30, 32, 34, 36, 38.
 */
export const STAFF_BOTTOM_STEP = 30 // E4, bottom line
export const STAFF_TOP_STEP = 38 // F5, top line

/** Diatonic steps of the five staff lines, bottom to top. */
export const STAFF_LINE_STEPS: readonly number[] = [30, 32, 34, 36, 38]

/**
 * Parse a scientific note name ("Bb3", "F#4", "C5", unicode ♯/♭ accepted) into
 * its staff placement. Returns `null` for anything unparseable.
 */
export function parseStaffNote(name: string): StaffNote | null {
  const match = /^([A-Ga-g])([#b♯♭]?)(-?\d+)$/.exec(name.trim())
  if (!match) return null

  const [, rawLetter, rawAccidental, octaveStr] = match
  const letter = rawLetter.toUpperCase()
  const accidental = (
    { '♯': '#', '♭': 'b', '#': '#', b: 'b', '': '' } as const
  )[rawAccidental] as '' | '#' | 'b'
  const octave = Number.parseInt(octaveStr, 10)

  return {
    name,
    letter,
    accidental,
    octave,
    diatonicStep: octave * 7 + LETTER_STEP[letter],
  }
}

/**
 * Diatonic steps at which ledger lines must be drawn for a note at
 * `diatonicStep` — the short line segments that extend the staff for notes
 * sitting above the top line or below the bottom line.
 *
 * Ledger lines only ever fall on even (line) steps. A note in the *space* just
 * outside the staff (e.g. G5 = 39, D4 = 29) needs none; a note on or beyond the
 * first ledger position does. Returned low-to-high, empty when the note is
 * within the staff.
 */
export function ledgerStepsFor(diatonicStep: number): number[] {
  const steps: number[] = []
  if (diatonicStep > STAFF_TOP_STEP) {
    // First ledger above the staff is two steps up from the top line.
    for (let s = STAFF_TOP_STEP + 2; s <= diatonicStep; s += 2) steps.push(s)
  } else if (diatonicStep < STAFF_BOTTOM_STEP) {
    for (let s = STAFF_BOTTOM_STEP - 2; s >= diatonicStep; s -= 2) steps.push(s)
    steps.reverse()
  }
  return steps
}
