import { describe, expect, it } from 'vitest'
import {
  A4_HZ,
  calibratedA4Hz,
  hzToMidi,
  midiToHz,
  midiToNoteName,
  noteNameToMidi,
  toNote,
} from './noteMapper'

describe('toNote', () => {
  it('maps exact A4 (440 Hz) to A4 with 0 cents', () => {
    const note = toNote(440, 1)
    expect(note).not.toBeNull()
    expect(note!.noteName).toBe('A4')
    expect(note!.midi).toBe(69)
    expect(note!.cents).toBe(0)
  })

  it('reports a sharp cents deviation for 445 Hz', () => {
    const note = toNote(445, 1)
    expect(note!.noteName).toBe('A4')
    // 445 Hz is ~+19.5 cents above A4.
    expect(note!.cents).toBeGreaterThanOrEqual(19)
    expect(note!.cents).toBeLessThanOrEqual(20)
  })

  it('resolves a frequency midway between two notes to the nearer one', () => {
    // Exactly halfway between A4 (69) and Bb4 (70): rounds up to Bb4 at -50¢.
    const note = toNote(midiToHz(69.5), 1)
    expect(note!.noteName).toBe('Bb4')
    expect(Math.abs(note!.cents)).toBe(50)
  })

  it('returns null for a low-clarity reading rather than guessing', () => {
    expect(toNote(440, 0.5)).toBeNull()
  })

  it('returns null for invalid frequencies', () => {
    expect(toNote(0, 1)).toBeNull()
    expect(toNote(-100, 1)).toBeNull()
    expect(toNote(Number.NaN, 1)).toBeNull()
  })

  it('carries clarity through', () => {
    expect(toNote(440, 0.97)!.clarity).toBe(0.97)
  })
})

describe('note number helpers', () => {
  it('round-trips MIDI ↔ Hz', () => {
    expect(hzToMidi(midiToHz(60))).toBeCloseTo(60, 6)
  })

  it('names MIDI numbers with flats', () => {
    expect(midiToNoteName(69)).toBe('A4')
    expect(midiToNoteName(58)).toBe('Bb3')
    expect(midiToNoteName(60)).toBe('C4')
  })

  it('parses note names (flats and sharps) back to MIDI', () => {
    expect(noteNameToMidi('A4')).toBe(69)
    expect(noteNameToMidi('Bb3')).toBe(58)
    expect(noteNameToMidi('A#3')).toBe(58)
    expect(noteNameToMidi('C4')).toBe(60)
    expect(noteNameToMidi('nonsense')).toBeNull()
  })
})

describe('calibratedA4Hz', () => {
  it('returns the standard reference for a zero offset', () => {
    expect(calibratedA4Hz(0)).toBe(A4_HZ)
  })

  it('shifts a reading sharper for a positive offset', () => {
    const note = toNote(440, 1, { a4Hz: calibratedA4Hz(10) })
    expect(note!.noteName).toBe('A4')
    expect(note!.cents).toBeGreaterThan(0)
  })

  it('shifts a reading flatter for a negative offset', () => {
    const note = toNote(440, 1, { a4Hz: calibratedA4Hz(-10) })
    expect(note!.noteName).toBe('A4')
    expect(note!.cents).toBeLessThan(0)
  })

  it('round-trips back to 0 cents when fed its own calibrated reference', () => {
    const a4Hz = calibratedA4Hz(7)
    const note = toNote(a4Hz, 1, { a4Hz })
    expect(note!.cents).toBe(0)
  })
})
