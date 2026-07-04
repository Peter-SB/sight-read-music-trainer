import { describe, expect, it } from 'vitest'
import {
  createDrillState,
  skipCurrentNote,
  updateDrill,
  type DrillConfig,
  type NoteSource,
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

/** Finite note source mirroring the old fixed-array semantics: yields `notes` in order, then null. */
function source(notes: string[]): NoteSource {
  let i = -1
  return () => {
    i++
    return i < notes.length ? notes[i] : null
  }
}

/** Endless note source that cycles `notes` forever, never returning null. */
function cyclingSource(notes: string[]): NoteSource {
  let i = -1
  return () => {
    i = (i + 1) % notes.length
    return notes[i]
  }
}

describe('drillStateMachine', () => {
  it('stays awaiting when correct pitch held under the threshold', () => {
    const s0 = createDrillState(source(['C4', 'D4']))
    const s1 = updateDrill(s0, reading('C4'), 0, source(['C4', 'D4']), CONFIG)
    const s2 = updateDrill(s1, reading('C4'), 200, source(['C4', 'D4']), CONFIG)
    expect(s2.phase).toBe('awaiting')
    expect(s2.holdStartedAt).toBe(0)
  })

  it('transitions to confirmed once held at/above the threshold', () => {
    const s0 = createDrillState(source(['C4', 'D4']))
    const s1 = updateDrill(s0, reading('C4'), 0, source(['C4', 'D4']), CONFIG)
    const s2 = updateDrill(s1, reading('C4'), 300, source(['C4', 'D4']), CONFIG)
    expect(s2.phase).toBe('confirmed')
  })

  it('stays awaiting on a wrong pitch under the hint timeout', () => {
    const s0 = createDrillState(source(['C4', 'D4']))
    const s1 = updateDrill(s0, reading('G4'), 0, source(['C4', 'D4']), CONFIG)
    const s2 = updateDrill(s1, reading('G4'), 1000, source(['C4', 'D4']), CONFIG)
    expect(s2.phase).toBe('awaiting')
  })

  it('reveals a hint after the wrong pitch persists past the timeout', () => {
    const s0 = createDrillState(source(['C4', 'D4']))
    const s1 = updateDrill(s0, reading('G4'), 0, source(['C4', 'D4']), CONFIG)
    const s2 = updateDrill(s1, reading('G4'), 2000, source(['C4', 'D4']), CONFIG)
    expect(s2.phase).toBe('hint')
  })

  it('goes confirmed -> revealed once the delay elapses, then advances after the pause', () => {
    const notes = source(['C4', 'D4'])
    const s0 = createDrillState(notes)
    const held = updateDrill(s0, reading('C4'), 0, notes, CONFIG)
    const confirmed = updateDrill(held, reading('C4'), 300, notes, CONFIG)
    expect(confirmed.phase).toBe('confirmed')

    const stillConfirmed = updateDrill(confirmed, reading('C4'), 600, notes, CONFIG)
    expect(stillConfirmed.phase).toBe('confirmed')

    const revealed = updateDrill(confirmed, reading('C4'), 1300, notes, CONFIG)
    expect(revealed.phase).toBe('revealed')

    const next = updateDrill(revealed, reading('C4'), 1900, notes, CONFIG)
    expect(next.phase).toBe('awaiting')
    expect(next.targetNote).toBe('D4')
  })

  it('reveals immediately when the delay is 0 (beginner "always show" mode)', () => {
    const zeroDelay: DrillConfig = { ...CONFIG, revealDelayMs: 0 }
    const notes = source(['C4', 'D4'])
    const s0 = createDrillState(notes)
    const held = updateDrill(s0, reading('C4'), 0, notes, zeroDelay)
    const revealed = updateDrill(held, reading('C4'), 300, notes, zeroDelay)
    expect(revealed.phase).toBe('revealed')
  })

  it('does not reset the hold timer for natural micro pitch wobble inside tolerance', () => {
    const notes = source(['C4'])
    const s0 = createDrillState(notes)
    const s1 = updateDrill(s0, reading('C4', 15), 0, notes, CONFIG)
    const s2 = updateDrill(s1, reading('C4', -18), 150, notes, CONFIG)
    const s3 = updateDrill(s2, reading('C4', 5), 300, notes, CONFIG)
    expect(s3.phase).toBe('confirmed')
    expect(s3.holdStartedAt).toBe(0)
  })

  it('treats silence as neutral: no false advance, resets hold progress', () => {
    const notes = source(['C4'])
    const s0 = createDrillState(notes)
    const held = updateDrill(s0, reading('C4'), 0, notes, CONFIG)
    const silence = updateDrill(held, null, 150, notes, CONFIG)
    expect(silence.phase).toBe('awaiting')
    expect(silence.holdStartedAt).toBeNull()

    const reheld = updateDrill(silence, reading('C4'), 150, notes, CONFIG)
    const confirmed = updateDrill(reheld, reading('C4'), 450, notes, CONFIG)
    expect(confirmed.phase).toBe('confirmed')
  })

  it('transitions to complete (not an error state) once the sequence is exhausted', () => {
    const zeroDelay: DrillConfig = { ...CONFIG, revealDelayMs: 0, advancePauseMs: 0 }
    const notes = source(['C4'])
    let s = createDrillState(notes)
    s = updateDrill(s, reading('C4'), 0, notes, zeroDelay)
    s = updateDrill(s, reading('C4'), 300, notes, zeroDelay)
    expect(s.phase).toBe('revealed')
    s = updateDrill(s, reading('C4'), 300, notes, zeroDelay)
    expect(s.phase).toBe('complete')
    expect(s.targetNote).toBeNull()
  })

  it('createDrillState is complete immediately when the source has no notes', () => {
    const empty: NoteSource = () => null
    const s = createDrillState(empty)
    expect(s.phase).toBe('complete')
    expect(s.targetNote).toBeNull()
  })

  it('populates lastNoteResult with the reaction delay at the hold-threshold transition, then clears it on advance', () => {
    const zeroDelay: DrillConfig = { ...CONFIG, revealDelayMs: 0, advancePauseMs: 0 }
    const notes = source(['C4', 'D4'])
    let s = createDrillState(notes)
    expect(s.lastNoteResult).toBeNull()

    // First frame: the note is "presented" at now=200 (noteStartedAt lazily set here),
    // pitch not yet correct long enough to cross holdMs.
    s = updateDrill(s, reading('C4'), 200, notes, zeroDelay)
    expect(s.phase).toBe('awaiting')

    // Second frame: holdMs (300) has now elapsed since holdStartedAt (200) -> threshold met.
    s = updateDrill(s, reading('C4'), 500, notes, zeroDelay)
    expect(s.phase).toBe('revealed')
    expect(s.lastNoteResult).toEqual({ note: 'C4', delayMs: 300 })

    s = updateDrill(s, reading('C4'), 500, notes, zeroDelay)
    expect(s.phase).toBe('awaiting')
    expect(s.targetNote).toBe('D4')
    expect(s.lastNoteResult).toBeNull()
  })

  it('endless note sources never reach complete', () => {
    const zeroDelay: DrillConfig = { ...CONFIG, revealDelayMs: 0, advancePauseMs: 0 }
    const notes = cyclingSource(['C4', 'D4'])
    let s = createDrillState(notes)
    for (let i = 0; i < 10; i++) {
      s = updateDrill(s, reading(s.targetNote!), i * 1000, notes, zeroDelay)
      s = updateDrill(s, reading(s.targetNote!), i * 1000 + 300, notes, zeroDelay)
    }
    expect(s.phase).not.toBe('complete')
  })

  it('skipCurrentNote force-advances past a note the player can\'t produce', () => {
    const notes = source(['C4', 'D4'])
    const s0 = createDrillState(notes)
    const s1 = skipCurrentNote(s0, notes, 0)
    expect(s1.phase).toBe('awaiting')
    expect(s1.targetNote).toBe('D4')
  })

  it('skipCurrentNote on the last note completes the drill', () => {
    const notes = source(['C4'])
    const s0 = createDrillState(notes)
    const s1 = skipCurrentNote(s0, notes, 0)
    expect(s1.phase).toBe('complete')
    expect(s1.targetNote).toBeNull()
  })

  it('skipCurrentNote is a no-op once already complete', () => {
    const notes = source(['C4'])
    const s0 = createDrillState(notes)
    const s1 = skipCurrentNote(s0, notes, 0)
    const s2 = skipCurrentNote(s1, notes, 0)
    expect(s2).toBe(s1)
  })
})
