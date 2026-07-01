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
 * Primary fingerings, cross-checked against `public/fingerings/saxaphone/
 * tenorsaxchart.pdf` (a standard Bb tenor conductor's-reference chart — the
 * same fingerings apply written, so it's a valid source for the whole family).
 * That verification caught several errors versus first-pass memory, notably:
 *   - G4 is L1–L3 only (not "all six" — that's a different, non-existent note)
 *   - F#4/Gb4's primary is the fork L1–L3+R2 (R1 stays up), not L1–L3+R1+R2
 *   - G#4/Ab4 uses no right hand at all: L1–L3 + the G# pinky key
 *   - A4 is only L1+L2 (not L1–L3)
 *   - B4, C5 and Db5 use simplified fingerings with the octave key UP —
 *     they don't mirror B3/C4/Db4 the way the rest of the upper register
 *     mirrors the lower register with the octave key added
 * D5–A5 and D6–F6 mirror the fundamental register with the octave key added,
 * per the chart. Db5, the Bb4/Bb5 alternates and the exact palm-key
 * combinations for C6–F6 were harder to read precisely off the scan — treat
 * those few entries as reasonable approximations rather than chart-verified.
 */
export const FINGERING_TABLE: Record<string, KeyId[]> = {
  Bb3: ['L1', 'L2', 'L3', 'R1', 'R2', 'R3', 'lpBb'],
  B3: ['L1', 'L2', 'L3', 'R1', 'R2', 'R3', 'lpB'],
  C4: ['L1', 'L2', 'L3', 'R1', 'R2', 'R3', 'rpC'],
  Db4: ['L1', 'L2', 'L3', 'R1', 'R2', 'R3', 'lpCSharp'],
  D4: ['L1', 'L2', 'L3', 'R1', 'R2', 'R3'],
  Eb4: ['L1', 'L2', 'L3', 'R1', 'R2', 'R3', 'rpEb'],
  E4: ['L1', 'L2', 'L3', 'R1', 'R2'],
  F4: ['L1', 'L2', 'L3', 'R1'],
  Gb4: ['L1', 'L2', 'L3', 'R2'], // fork fingering (R1 stays up)
  G4: ['L1', 'L2', 'L3'],
  Ab4: ['L1', 'L2', 'L3', 'lpGSharp'], // no right hand
  A4: ['L1', 'L2'],

  // Octave-key register begins here — except Bb4/B4/C5/Db5, which use
  // octave-free cross-fingerings per the chart rather than a mirror.
  Bb4: ['octave', 'L1', 'L2'], // "bis" Bb
  B4: ['L1'], // no octave key
  C5: ['L2'], // no octave key
  Db5: ['octave', 'sideC'], // approximate — hardest cell to read on the scan
  D5: ['octave', 'L1', 'L2', 'L3', 'R1', 'R2', 'R3'],
  Eb5: ['octave', 'L1', 'L2', 'L3', 'R1', 'R2', 'R3', 'rpEb'],
  E5: ['octave', 'L1', 'L2', 'L3', 'R1', 'R2'],
  F5: ['octave', 'L1', 'L2', 'L3', 'R1'],
  Gb5: ['octave', 'L1', 'L2', 'L3', 'R2'], // fork, mirrors Gb4
  G5: ['octave', 'L1', 'L2', 'L3'],
  Ab5: ['octave', 'L1', 'L2', 'L3', 'lpGSharp'],
  A5: ['octave', 'L1', 'L2'],

  // Top of the range: side/palm-key territory. The chart confirms palm keys
  // drive C6–F6; exact combinations here are a best-effort approximation.
  Bb5: ['octave', 'L1', 'L2', 'sideBb'],
  B5: ['octave', 'L1', 'palmD'],
  C6: ['octave', 'L1', 'palmD', 'palmEb'],
  Db6: ['octave', 'L1', 'palmD', 'palmEb', 'palmF'],
  D6: ['octave', 'L1', 'palmD'],
  Eb6: ['octave', 'L1', 'palmD', 'palmEb'],
  E6: ['octave', 'L1', 'sideE', 'palmD'],
  F6: ['octave', 'L1', 'palmD', 'palmEb', 'palmF'],
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
