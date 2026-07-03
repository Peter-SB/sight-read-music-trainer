import { describe, expect, it } from 'vitest'
import {
  createDrillState,
  updateDrill,
  type DrillConfig,
} from './drillStateMachine'
import type { NoteReading } from '../audio/types'

const CONFIG: DrillConfig = {
  holdMs: 300,
  toleranceCents: 20,
  revealDelayMs: 1000,
  hintTimeoutMs: 2000,
  advancePauseMs: 500,
}

function reading(noteName: string, cents = 0): NoteReading {
  return { noteName, pitchClass: noteName.slice(0, -1), octave: 0, midi: 0, cents, clarity: 1 }
}

describe('drillStateMachine', () => {
  it('stays awaiting when correct pitch held under the threshold', () => {
    const s0 = createDrillState(['C4', 'D4'])
    const s1 = updateDrill(s0, reading('C4'), 0, CONFIG)
    const s2 = updateDrill(s1, reading('C4'), 200, CONFIG)
    expect(s2.phase).toBe('awaiting')
    expect(s2.holdStartedAt).toBe(0)
  })

  it('transitions to confirmed once held at/above the threshold', () => {
    const s0 = createDrillState(['C4', 'D4'])
    const s1 = updateDrill(s0, reading('C4'), 0, CONFIG)
    const s2 = updateDrill(s1, reading('C4'), 300, CONFIG)
    expect(s2.phase).toBe('confirmed')
  })

  it('stays awaiting on a wrong pitch under the hint timeout', () => {
    const s0 = createDrillState(['C4', 'D4'])
    const s1 = updateDrill(s0, reading('G4'), 0, CONFIG)
    const s2 = updateDrill(s1, reading('G4'), 1000, CONFIG)
    expect(s2.phase).toBe('awaiting')
  })

  it('reveals a hint after the wrong pitch persists past the timeout', () => {
    const s0 = createDrillState(['C4', 'D4'])
    const s1 = updateDrill(s0, reading('G4'), 0, CONFIG)
    const s2 = updateDrill(s1, reading('G4'), 2000, CONFIG)
    expect(s2.phase).toBe('hint')
  })

  it('goes confirmed -> revealed once the delay elapses, then advances after the pause', () => {
    const s0 = createDrillState(['C4', 'D4'])
    const held = updateDrill(s0, reading('C4'), 0, CONFIG)
    const confirmed = updateDrill(held, reading('C4'), 300, CONFIG)
    expect(confirmed.phase).toBe('confirmed')

    const stillConfirmed = updateDrill(confirmed, reading('C4'), 600, CONFIG)
    expect(stillConfirmed.phase).toBe('confirmed')

    const revealed = updateDrill(confirmed, reading('C4'), 1300, CONFIG)
    expect(revealed.phase).toBe('revealed')

    const next = updateDrill(revealed, reading('C4'), 1900, CONFIG)
    expect(next.phase).toBe('awaiting')
    expect(next.targetNote).toBe('D4')
  })

  it('reveals immediately when the delay is 0 (beginner "always show" mode)', () => {
    const zeroDelay: DrillConfig = { ...CONFIG, revealDelayMs: 0 }
    const s0 = createDrillState(['C4', 'D4'])
    const held = updateDrill(s0, reading('C4'), 0, zeroDelay)
    const revealed = updateDrill(held, reading('C4'), 300, zeroDelay)
    expect(revealed.phase).toBe('revealed')
  })

  it('does not reset the hold timer for natural micro pitch wobble inside tolerance', () => {
    const s0 = createDrillState(['C4'])
    const s1 = updateDrill(s0, reading('C4', 15), 0, CONFIG)
    const s2 = updateDrill(s1, reading('C4', -18), 150, CONFIG)
    const s3 = updateDrill(s2, reading('C4', 5), 300, CONFIG)
    expect(s3.phase).toBe('confirmed')
    expect(s3.holdStartedAt).toBe(0)
  })

  it('treats silence as neutral: no false advance, resets hold progress', () => {
    const s0 = createDrillState(['C4'])
    const held = updateDrill(s0, reading('C4'), 0, CONFIG)
    const silence = updateDrill(held, null, 150, CONFIG)
    expect(silence.phase).toBe('awaiting')
    expect(silence.holdStartedAt).toBeNull()

    const reheld = updateDrill(silence, reading('C4'), 150, CONFIG)
    const confirmed = updateDrill(reheld, reading('C4'), 450, CONFIG)
    expect(confirmed.phase).toBe('confirmed')
  })

  it('transitions to complete (not an error state) once the sequence is exhausted', () => {
    const zeroDelay: DrillConfig = { ...CONFIG, revealDelayMs: 0, advancePauseMs: 0 }
    let s = createDrillState(['C4'])
    s = updateDrill(s, reading('C4'), 0, zeroDelay)
    s = updateDrill(s, reading('C4'), 300, zeroDelay)
    expect(s.phase).toBe('revealed')
    s = updateDrill(s, reading('C4'), 300, zeroDelay)
    expect(s.phase).toBe('complete')
    expect(s.targetNote).toBeNull()
  })
})
