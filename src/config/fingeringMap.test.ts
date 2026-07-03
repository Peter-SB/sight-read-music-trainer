import { describe, expect, it } from 'vitest'
import { keysForConcertNote, keysForWrittenNote } from './fingeringMap'

describe('keysForWrittenNote', () => {
  it('returns the low Bb fingering', () => {
    expect(keysForWrittenNote('Bb3')).toEqual([
      'L1',
      'L2',
      'L3',
      'R1',
      'R2',
      'R3',
      'lpBb',
      'rpC',
    ])
  })

  it('returns the left-hand-alone A fingering', () => {
    expect(keysForWrittenNote('A4')).toEqual(['L1', 'L2'])
  })

  it('returns the "all six" G fingering without the right hand', () => {
    expect(keysForWrittenNote('G4')).toEqual(['L1', 'L2', 'L3'])
  })

  it('returns null for a note outside the table', () => {
    expect(keysForWrittenNote('C9')).toBeNull()
  })
})

describe('keysForConcertNote', () => {
  it('converts concert pitch to written pitch before lookup (tenor +14)', () => {
    // Concert C4 on tenor sax is written D5.
    expect(keysForConcertNote('C4', 'tenor_sax')).toEqual(
      keysForWrittenNote('D5'),
    )
  })

  it('converts concert pitch to written pitch before lookup (alto +9)', () => {
    // Concert C4 on alto sax is written A4.
    expect(keysForConcertNote('C4', 'alto_sax')).toEqual(
      keysForWrittenNote('A4'),
    )
  })

  it('returns null for an unparseable note name', () => {
    expect(keysForConcertNote('???', 'tenor_sax')).toBeNull()
  })
})
