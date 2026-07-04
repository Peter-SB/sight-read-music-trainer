import { describe, expect, it } from 'vitest'
import {
  ledgerStepsFor,
  parseStaffNote,
  STAFF_BOTTOM_STEP,
  STAFF_TOP_STEP,
} from './staffPosition'

describe('parseStaffNote', () => {
  it('places notes by letter and octave, ignoring the accidental', () => {
    expect(parseStaffNote('E4')?.diatonicStep).toBe(STAFF_BOTTOM_STEP) // 30
    expect(parseStaffNote('F5')?.diatonicStep).toBe(STAFF_TOP_STEP) // 38
    // Accidental never moves the note off its letter's line/space.
    expect(parseStaffNote('C4')?.diatonicStep).toBe(parseStaffNote('C#4')?.diatonicStep)
    expect(parseStaffNote('C4')?.diatonicStep).toBe(parseStaffNote('Cb4')?.diatonicStep)
  })

  it('normalises flats, sharps and unicode accidentals', () => {
    expect(parseStaffNote('Bb3')?.accidental).toBe('b')
    expect(parseStaffNote('F#4')?.accidental).toBe('#')
    expect(parseStaffNote('A♭4')?.accidental).toBe('b')
    expect(parseStaffNote('G♯4')?.accidental).toBe('#')
    expect(parseStaffNote('C4')?.accidental).toBe('')
  })

  it('returns null for unparseable input', () => {
    expect(parseStaffNote('H4')).toBeNull()
    expect(parseStaffNote('')).toBeNull()
    expect(parseStaffNote('C')).toBeNull()
  })
})

describe('ledgerStepsFor', () => {
  it('returns none for notes inside the staff', () => {
    expect(ledgerStepsFor(parseStaffNote('E4')!.diatonicStep)).toEqual([]) // bottom line
    expect(ledgerStepsFor(parseStaffNote('B4')!.diatonicStep)).toEqual([]) // middle line
    expect(ledgerStepsFor(parseStaffNote('F5')!.diatonicStep)).toEqual([]) // top line
  })

  it('returns none for the space just outside the staff', () => {
    expect(ledgerStepsFor(parseStaffNote('G5')!.diatonicStep)).toEqual([]) // space above top
    expect(ledgerStepsFor(parseStaffNote('D4')!.diatonicStep)).toEqual([]) // space below bottom
  })

  it('adds one ledger line for middle C and A5', () => {
    expect(ledgerStepsFor(parseStaffNote('C4')!.diatonicStep)).toEqual([28])
    expect(ledgerStepsFor(parseStaffNote('A5')!.diatonicStep)).toEqual([40])
  })

  it('shares the ledger line with a note sitting on the far side of it', () => {
    expect(ledgerStepsFor(parseStaffNote('B3')!.diatonicStep)).toEqual([28]) // below C4's line
    expect(ledgerStepsFor(parseStaffNote('B5')!.diatonicStep)).toEqual([40]) // above A5's line
  })

  it('stacks multiple ledger lines for notes further out', () => {
    expect(ledgerStepsFor(parseStaffNote('A3')!.diatonicStep)).toEqual([26, 28])
    expect(ledgerStepsFor(parseStaffNote('C6')!.diatonicStep)).toEqual([40, 42])
  })
})
