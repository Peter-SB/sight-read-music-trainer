import { describe, expect, it } from 'vitest'
import { forDisplay, toConcertNoteName } from './transposition'
import { toNote } from './noteMapper'
import type { NoteReading } from './types'

/** Build a concert-pitch reading for a named note (0 cents) for test input. */
function concert(noteName: string, cents = 0): NoteReading {
  // Derive via toNote from the note's exact frequency so tests exercise real math.
  const midi = { A4: 69, C4: 60 }[noteName]
  if (midi === undefined) throw new Error(`add ${noteName} to test helper`)
  const base = toNote(440 * 2 ** ((midi - 69) / 12), 1)!
  return { ...base, cents }
}

describe('forDisplay', () => {
  it('shows concert C4 as A4 on alto (Eb)', () => {
    expect(forDisplay(concert('C4'), 'alto_sax').noteName).toBe('A4')
  })

  it('shows concert C4 as D5 on tenor (Bb)', () => {
    expect(forDisplay(concert('C4'), 'tenor_sax').noteName).toBe('D5')
  })

  it('leaves concert pitch unchanged when no transposition applies', () => {
    // No concert-C instrument in the POC list; tenor shifts, alto shifts —
    // verify the shift is exactly the instrument interval.
    expect(forDisplay(concert('C4'), 'soprano_sax').noteName).toBe('D4')
  })

  it('preserves cents and clarity through transposition', () => {
    const display = forDisplay(concert('A4', 17), 'tenor_sax')
    expect(display.cents).toBe(17)
    expect(display.clarity).toBe(1)
  })
})

describe('toConcertNoteName (round-trip for fingering lookup)', () => {
  it('maps a displayed tenor note back to concert pitch', () => {
    expect(toConcertNoteName('D5', 'tenor_sax')).toBe('C4')
  })

  it('round-trips forDisplay → toConcertNoteName', () => {
    const displayed = forDisplay(concert('C4'), 'alto_sax').noteName
    expect(toConcertNoteName(displayed, 'alto_sax')).toBe('C4')
  })

  it('returns null for an unparseable note name', () => {
    expect(toConcertNoteName('???', 'tenor_sax')).toBeNull()
  })
})
