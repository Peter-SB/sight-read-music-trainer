import type { KeyId } from './keys'
import type { InstrumentId } from './instruments'
import { INSTRUMENTS } from './instruments'
import { midiToNoteName, noteNameToMidi } from '../audio/noteMapper'

/**
 * Note → physical-key fingering table.
 *
 * Keyed by *written* note name, not concert pitch: the Boehm fingering system
 * is shared across the whole Bb/Eb saxophone family, so a written D5 is
 * fingered identically on alto, tenor, soprano and bari — only the pitch that
 * sounds differs. This lets one table serve every {@link InstrumentId}.
 *
 * Primary fingerings, cross-checked against two independent sources:
 *   1. `public/fingerings/saxaphone/tenorsaxchart.pdf`, a standard Bb tenor
 *      conductor's-reference chart (same fingerings apply written, so it's a
 *      valid source for the whole family).
 *   2. Delta-analysis of a commercial fingering-chart tool's note→key-index
 *      data (23 physical keys, indexed 0–22), inferred by comparing which
 *      indices turn on/off between adjacent chromatic notes — not by reading
 *      their code's key labels directly, since those didn't line up with
 *      actual anatomy (e.g. images named "l4"–"l7" turned out to map to the
 *      main L3/L2/L1 keys by note-count, not to the pinky cluster).
 * Agreement between the two caught several errors versus first-pass memory:
 *   - G4 is L1–L3 only (not "all six" — that's a different, non-existent note)
 *   - F#4/Gb4's primary is the fork L1–L3+R2 (R1 stays up), not L1–L3+R1+R2
 *   - G#4/Ab4 uses no right hand at all: L1–L3 + the G# pinky key
 *   - A4 is only L1+L2 (not L1–L3)
 *   - Bb4, B4, C5 and Db5 all use the octave key UP — they don't mirror
 *     Bb3/B3/C4/Db4 the way the rest of the upper register mirrors the lower
 *     register with the octave key added; the octave-mirror register only
 *     really starts at D5
 *   - Bb3 and Db4 both also need the right-pinky C key alongside their left-
 *     pinky lever (confirmed by both sources independently)
 *   - C6 is just octave+L2 (mirroring C5's single-key oddity), not a palm-key
 *     fingering; D6/Eb6/E6/F6 use palm keys without L1
 * D5–A5 mirror the fundamental register with the octave key added. Db5, the
 * Bb4/Bb5 alternates and Db6 were hardest to pin down precisely — treat those
 * few entries as reasonable approximations rather than fully verified.
 */
export const FINGERING_TABLE: Record<string, KeyId[]> = {
  Bb3: ['L1', 'L2', 'L3', 'R1', 'R2', 'R3', 'lpBb', 'rpC'],
  B3: ['L1', 'L2', 'L3', 'R1', 'R2', 'R3', 'lpB', 'rpC'],
  C4: ['L1', 'L2', 'L3', 'R1', 'R2', 'R3', 'rpC'],
  Db4: ['L1', 'L2', 'L3', 'R1', 'R2', 'R3', 'lpCSharp', 'rpC'],
  D4: ['L1', 'L2', 'L3', 'R1', 'R2', 'R3'],
  Eb4: ['L1', 'L2', 'L3', 'R1', 'R2', 'R3', 'rpEb'],
  E4: ['L1', 'L2', 'L3', 'R1', 'R2'],
  F4: ['L1', 'L2', 'L3', 'R1'],
  Gb4: ['L1', 'L2', 'L3', 'R2'], // fork fingering (R1 stays up)
  G4: ['L1', 'L2', 'L3'],
  Ab4: ['L1', 'L2', 'L3', 'lpGSharp'], // no right hand
  A4: ['L1', 'L2'],

  // Octave-key register begins here — except Bb4/B4/C5/Db5, which use
  // octave-free cross-fingerings per both sources rather than a mirror.
  Bb4: ['L1', 'L2', 'sideBb'], // "bis" Bb, no octave key
  B4: ['L1'], // no octave key
  C5: ['L2'], // no octave key
  Db5: [], // approximate — hardest cell to pin down
  D5: ['octave', 'L1', 'L2', 'L3', 'R1', 'R2', 'R3'],
  Eb5: ['octave', 'L1', 'L2', 'L3', 'R1', 'R2', 'R3', 'rpEb'],
  E5: ['octave', 'L1', 'L2', 'L3', 'R1', 'R2'],
  F5: ['octave', 'L1', 'L2', 'L3', 'R1'],
  Gb5: ['octave', 'L1', 'L2', 'L3', 'R2'], // fork, mirrors Gb4
  G5: ['octave', 'L1', 'L2', 'L3'],
  Ab5: ['octave', 'L1', 'L2', 'L3', 'lpGSharp'],
  A5: ['octave', 'L1', 'L2'],

  // Top of the range: side/palm-key territory.
  Bb5: ['octave', 'L1', 'L2', 'sideBb'], //todo- fix
  B5: ['octave', 'L1', ],
  C6: ['octave', 'L2'], // mirrors C5's single-key fingering, not a palm key
  Db6: ['octave'], // approximate
  D6: ['octave', 'palmD'],
  Eb6: ['octave', 'palmD', 'palmEb'],
  E6: ['octave', 'R1', 'palmD', 'palmEb'],
  F6: ['octave', 'R1', 'palmD', 'palmEb', 'palmF', "sideC"],
}

/** Look up the keys pressed for a written note name (e.g. "Bb4"). */
export function keysForWrittenNote(writtenNoteName: string): KeyId[] | null {
  return FINGERING_TABLE[writtenNoteName] ?? null
}

/**
 * Look up the keys pressed for a *concert*-pitch note as played on `instrument`,
 * converting to the written pitch the fingering table is keyed by.
 */
export function keysForConcertNote(
  concertNoteName: string,
  instrument: InstrumentId,
): KeyId[] | null {
  const concertMidi = noteNameToMidi(concertNoteName)
  if (concertMidi === null) return null

  const { transposeSemitones } = INSTRUMENTS[instrument]
  const writtenName = midiToNoteName(concertMidi + transposeSemitones)
  return keysForWrittenNote(writtenName)
}
