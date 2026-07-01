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
