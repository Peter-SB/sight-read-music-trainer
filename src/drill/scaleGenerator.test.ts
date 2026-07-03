import { describe, expect, it, vi } from 'vitest'
import { allNotesInRange, generateScale, shuffleSequence } from './scaleGenerator'

describe('generateScale', () => {
  it('produces an ascending F major sequence within range', () => {
    expect(generateScale('F', 'major', { low: 'F4', high: 'F5' })).toEqual([
      'F4',
      'G4',
      'A4',
      'Bb4',
      'C5',
      'D5',
      'E5',
      'F5',
    ])
  })

  it('clips at both ends when the scale does not fit cleanly in range', () => {
    // C major starting mid-scale (from A3) and ending mid-scale (at D5).
    expect(generateScale('C', 'major', { low: 'A3', high: 'D5' })).toEqual([
      'A3',
      'B3',
      'C4',
      'D4',
      'E4',
      'F4',
      'G4',
      'A4',
      'B4',
      'C5',
      'D5',
    ])
  })

  it('produces every semitone for chromatic', () => {
    expect(generateScale('C', 'chromatic', { low: 'C4', high: 'C5' })).toHaveLength(13)
  })

  it('returns an empty sequence for an inverted range', () => {
    expect(generateScale('C', 'major', { low: 'C5', high: 'C4' })).toEqual([])
  })

  it('returns an empty sequence for an unparseable root or bound', () => {
    expect(generateScale('H', 'major', { low: 'C4', high: 'C5' })).toEqual([])
    expect(generateScale('C', 'major', { low: '???', high: 'C5' })).toEqual([])
  })
})

describe('shuffleSequence', () => {
  it('does not mutate the input array', () => {
    const original = ['C4', 'D4', 'E4', 'F4']
    const copy = [...original]
    shuffleSequence(original)
    expect(original).toEqual(copy)
  })

  it('preserves all elements, just reordered', () => {
    const original = ['C4', 'D4', 'E4', 'F4', 'G4']
    const shuffled = shuffleSequence(original)
    expect(shuffled).toHaveLength(original.length)
    expect([...shuffled].sort()).toEqual([...original].sort())
  })

  it('is deterministic given a stubbed Math.random', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    expect(shuffleSequence(['A', 'B', 'C', 'D'])).toEqual(['B', 'C', 'D', 'A'])
    vi.restoreAllMocks()
  })
})

describe('allNotesInRange', () => {
  it('returns every chromatic note inclusive of both bounds', () => {
    expect(allNotesInRange({ low: 'C4', high: 'D4' })).toEqual(['C4', 'Db4', 'D4'])
  })

  it('returns an empty list for an inverted or unparseable range', () => {
    expect(allNotesInRange({ low: 'D4', high: 'C4' })).toEqual([])
    expect(allNotesInRange({ low: '???', high: 'C4' })).toEqual([])
  })
})
