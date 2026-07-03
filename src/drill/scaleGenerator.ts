import { midiToNoteName, noteNameToMidi } from '../audio/noteMapper'
import { SCALES, type ScaleId } from '../config/scales'

/**
 * Given a scale + root + note range, produce the ascending note sequence a
 * drill walks through. Pure — no audio/DOM deps, so it's fully unit-testable.
 */

export interface NoteRange {
  /** Inclusive lower bound, e.g. "Bb3". */
  low: string
  /** Inclusive upper bound, e.g. "F6". */
  high: string
}

/**
 * Build the ascending sequence of note names (e.g. "Bb3", "C4", ...) for
 * `scaleId` rooted on `root` (a bare pitch class like "Bb"), clipped to
 * `range` inclusive. Returns [] if the range is invalid/empty or the root
 * can't be parsed.
 */
export function generateScale(
  root: string,
  scaleId: ScaleId,
  range: NoteRange,
): string[] {
  const lowMidi = noteNameToMidi(range.low)
  const highMidi = noteNameToMidi(range.high)
  const rootMidi = noteNameToMidi(`${root}4`)
  if (lowMidi === null || highMidi === null || rootMidi === null) return []
  if (highMidi < lowMidi) return []

  const rootSemitone = ((rootMidi % 12) + 12) % 12
  const { intervals } = SCALES[scaleId]
  const memberSemitones = new Set(
    intervals.map((interval) => (rootSemitone + interval) % 12),
  )

  const sequence: string[] = []
  for (let midi = lowMidi; midi <= highMidi; midi++) {
    const semitone = ((midi % 12) + 12) % 12
    if (memberSemitones.has(semitone)) sequence.push(midiToNoteName(midi))
  }
  return sequence
}

/** Fisher-Yates shuffle. Returns a new array; does not mutate `sequence`. */
export function shuffleSequence(sequence: string[]): string[] {
  const shuffled = [...sequence]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

/** Every chromatic note name in `range`, inclusive. Returns [] for an invalid/inverted range. */
export function allNotesInRange(range: NoteRange): string[] {
  const lowMidi = noteNameToMidi(range.low)
  const highMidi = noteNameToMidi(range.high)
  if (lowMidi === null || highMidi === null || highMidi < lowMidi) return []

  const notes: string[] = []
  for (let midi = lowMidi; midi <= highMidi; midi++) notes.push(midiToNoteName(midi))
  return notes
}
