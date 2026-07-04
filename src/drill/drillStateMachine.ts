import type { NoteReading } from '../audio/types'

/**
 * Drill state machine: walks a note sequence, advancing only when the target
 * pitch is held in tune for a threshold duration. Pure and framework-agnostic
 * (fed synthetic `NoteReading`s + timestamps) so it's testable with no mic or
 * browser — the highest-value test surface in the app per the design doc.
 *
 * Phase flow:
 *   awaiting --hold threshold met--> confirmed --delay elapsed--> revealed --pause--> awaiting (next) | complete
 *   awaiting --wrong pitch past hintTimeoutMs--> hint --hold threshold met--> revealed/confirmed (same as awaiting)
 */

export type DrillPhase = 'awaiting' | 'confirmed' | 'revealed' | 'hint' | 'complete'

export interface DrillState {
  sequence: string[]
  index: number
  phase: DrillPhase
  /** Concert-pitch note name currently being asked for, or null once complete. */
  targetNote: string | null
  holdStartedAt: number | null
  wrongSinceMs: number | null
  /** Timestamp the current phase was entered, used for delay/pause timers. */
  phaseEnteredAt: number | null
}

export interface DrillConfig {
  /** How long the correct pitch must be held (ms) before it counts as confirmed. */
  holdMs: number
  /** Max absolute cents deviation still counted as "in tune". */
  toleranceCents: number
  /** Delay (ms) between confirmation and the fingering chart revealing. 0 = immediate. */
  revealDelayMs: number
  /** How long a wrong pitch may persist (ms) before the fingering reveals as a hint. */
  hintTimeoutMs: number
  /** Pause (ms) after reveal before advancing to the next note. */
  advancePauseMs: number
}

export const DEFAULT_DRILL_CONFIG: DrillConfig = {
  holdMs: 400,
  toleranceCents: 20,
  revealDelayMs: 1000,
  hintTimeoutMs: 4000,
  advancePauseMs: 600,
}

export function createDrillState(sequence: string[]): DrillState {
  return {
    sequence,
    index: 0,
    phase: sequence.length > 0 ? 'awaiting' : 'complete',
    targetNote: sequence[0] ?? null,
    holdStartedAt: null,
    wrongSinceMs: null,
    phaseEnteredAt: null,
  }
}

function isCorrect(
  reading: NoteReading | null,
  target: string,
  toleranceCents: number,
): boolean {
  return (
    reading !== null &&
    reading.noteName === target &&
    Math.abs(reading.cents) <= toleranceCents
  )
}

function advance(state: DrillState): DrillState {
  const nextIndex = state.index + 1
  if (nextIndex >= state.sequence.length) {
    return {
      ...state,
      index: nextIndex,
      phase: 'complete',
      targetNote: null,
      holdStartedAt: null,
      wrongSinceMs: null,
      phaseEnteredAt: null,
    }
  }
  return {
    ...state,
    index: nextIndex,
    phase: 'awaiting',
    targetNote: state.sequence[nextIndex],
    holdStartedAt: null,
    wrongSinceMs: null,
    phaseEnteredAt: null,
  }
}

/** Force-advance past the current note, e.g. when the player can't produce it or the mic won't register it. */
export function skipCurrentNote(state: DrillState): DrillState {
  if (state.phase === 'complete') return state
  return advance(state)
}

/**
 * Advance the drill by one reading. Pass `reading: null` for silence/no
 * confident pitch — treated as neutral (resets hold progress, but doesn't
 * count toward the wrong-pitch hint timeout).
 */
export function updateDrill(
  state: DrillState,
  reading: NoteReading | null,
  now: number,
  config: DrillConfig = DEFAULT_DRILL_CONFIG,
): DrillState {
  switch (state.phase) {
    case 'complete':
      return state

    case 'awaiting':
    case 'hint': {
      const correct = isCorrect(reading, state.targetNote!, config.toleranceCents)

      if (correct) {
        const holdStartedAt = state.holdStartedAt ?? now
        if (now - holdStartedAt >= config.holdMs) {
          return config.revealDelayMs <= 0
            ? { ...state, phase: 'revealed', holdStartedAt, wrongSinceMs: null, phaseEnteredAt: now }
            : { ...state, phase: 'confirmed', holdStartedAt, wrongSinceMs: null, phaseEnteredAt: now }
        }
        return { ...state, holdStartedAt, wrongSinceMs: null }
      }

      if (reading === null) {
        // Silence: don't punish, but don't let a stray hold carry over either.
        return { ...state, holdStartedAt: null }
      }

      const wrongSinceMs = state.wrongSinceMs ?? now
      if (state.phase === 'awaiting' && now - wrongSinceMs >= config.hintTimeoutMs) {
        return { ...state, phase: 'hint', holdStartedAt: null, wrongSinceMs, phaseEnteredAt: now }
      }
      return { ...state, holdStartedAt: null, wrongSinceMs }
    }

    case 'confirmed': {
      if (now - (state.phaseEnteredAt ?? now) >= config.revealDelayMs) {
        return { ...state, phase: 'revealed', phaseEnteredAt: now }
      }
      return state
    }

    case 'revealed': {
      if (now - (state.phaseEnteredAt ?? now) >= config.advancePauseMs) {
        return advance(state)
      }
      return state
    }

    default:
      return state
  }
}
