import type { NoteReading } from './types'
import { midiToNoteName, noteNameToMidi } from './noteMapper'
import { INSTRUMENTS, type InstrumentId } from '../config/instruments'

/**
 * Concert-pitch ↔ instrument-displayed-note conversion.
 *
 * Kept isolated (and pure) because it's the one place instrument identity leaks
 * into note math. Detection stays in concert pitch; only display and chart
 * lookup go through here.
 */

/**
 * Convert a concert-pitch reading into the note the player of `instrument`
 * would read/see, shifting by the instrument's transposition. Cents, clarity
 * and octave-relative deviation are preserved — only the note name/MIDI shift.
 */
export function forDisplay(
  concert: NoteReading,
  instrument: InstrumentId,
): NoteReading {
  const { transposeSemitones } = INSTRUMENTS[instrument]
  const writtenMidi = concert.midi + transposeSemitones
  const writtenName = midiToNoteName(writtenMidi)
  // Strip trailing octave digits to recover the pitch class + octave.
  const octaveMatch = /(-?\d+)$/.exec(writtenName)
  const octave = octaveMatch ? Number.parseInt(octaveMatch[1], 10) : concert.octave
  const pitchClass = octaveMatch
    ? writtenName.slice(0, octaveMatch.index)
    : writtenName

  return {
    ...concert,
    noteName: writtenName,
    pitchClass,
    octave,
    midi: writtenMidi,
  }
}

/**
 * Inverse of {@link forDisplay}: given a note as displayed for `instrument`,
 * return the concert-pitch note name (used for fingering-chart lookup, which is
 * keyed by concert pitch). Returns `null` if the name can't be parsed.
 */
export function toConcertNoteName(
  displayedNoteName: string,
  instrument: InstrumentId,
): string | null {
  const writtenMidi = noteNameToMidi(displayedNoteName)
  if (writtenMidi === null) return null
  const { transposeSemitones } = INSTRUMENTS[instrument]
  return midiToNoteName(writtenMidi - transposeSemitones)
}

/**
 * Bare-string counterpart to {@link forDisplay}: convert a concert-pitch note
 * name straight to the written name for `instrument`, without needing a full
 * {@link NoteReading}. Used by drill UI to label a target note. Returns `null`
 * if the name can't be parsed.
 */
export function concertToWrittenNoteName(
  concertNoteName: string,
  instrument: InstrumentId,
): string | null {
  const concertMidi = noteNameToMidi(concertNoteName)
  if (concertMidi === null) return null
  const { transposeSemitones } = INSTRUMENTS[instrument]
  return midiToNoteName(concertMidi + transposeSemitones)
}

/** Strip a trailing octave digit group off a note name, leaving just the pitch class. */
function stripOctave(noteName: string): string {
  return noteName.replace(/-?\d+$/, '')
}

/**
 * Convert a bare pitch class (e.g. "D", no octave) as a player of `instrument`
 * would read it into the concert-pitch pitch class it actually sounds. Used
 * when a scale root is picked "as written" rather than in concert pitch —
 * {@link ../drill/scaleGenerator}'s `generateScale` always expects a concert
 * root. Returns `null` if the pitch class can't be parsed.
 */
export function writtenPitchClassToConcert(
  writtenPitchClass: string,
  instrument: InstrumentId,
): string | null {
  const concertNoteName = toConcertNoteName(`${writtenPitchClass}4`, instrument)
  return concertNoteName === null ? null : stripOctave(concertNoteName)
}

/** Inverse of {@link writtenPitchClassToConcert}: concert pitch class to written. Returns `null` if unparseable. */
export function concertPitchClassToWritten(
  concertPitchClass: string,
  instrument: InstrumentId,
): string | null {
  const writtenNoteName = concertToWrittenNoteName(`${concertPitchClass}4`, instrument)
  return writtenNoteName === null ? null : stripOctave(writtenNoteName)
}
