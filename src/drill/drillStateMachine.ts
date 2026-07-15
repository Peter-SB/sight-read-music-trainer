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

/**
 * Pulls the next target note given the previous one (or `null` for the very
 * first note), or `null` if there's no note to give (empty pool). Called
 * synchronously; implementations own their own cycling/RNG state internally.
 */
export type NoteSource = (previousNote: string | null) => string | null

/** A completed note's reaction time, surfaced once at the hold-threshold transition. */
export interface NoteResult {
  note: string
  delayMs: number
}

export interface DrillState {
  phase: DrillPhase
  /** Concert-pitch note name currently being asked for, or null once complete. */
  targetNote: string | null
  holdStartedAt: number | null
  wrongSinceMs: number | null
  /** Timestamp the current phase was entered, used for delay/pause timers. */
  phaseEnteredAt: number | null
  /** Timestamp the current target note was first presented (first frame processed for it). */
  noteStartedAt: number | null
  /** Count of notes completed so far, for progress display. */
  notesPlayed: number
  /** Set once, at the moment the current/just-finished note first met the hold threshold; cleared on advance. */
  lastNoteResult: NoteResult | null
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
  advancePauseMs: 50,
}

export function createDrillState(getNextNote: NoteSource): DrillState {
  const first = getNextNote(null)
  return {
    phase: first !== null ? 'awaiting' : 'complete',
    targetNote: first,
    holdStartedAt: null,
    wrongSinceMs: null,
    phaseEnteredAt: null,
    noteStartedAt: null,
    notesPlayed: 0,
    lastNoteResult: null,
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

function advance(state: DrillState, getNextNote: NoteSource, now: number): DrillState {
  const next = getNextNote(state.targetNote)
  if (next === null) {
    return {
      ...state,
      phase: 'complete',
      targetNote: null,
      holdStartedAt: null,
      wrongSinceMs: null,
      phaseEnteredAt: null,
      noteStartedAt: null,
      lastNoteResult: null,
    }
  }
  return {
    ...state,
    phase: 'awaiting',
    targetNote: next,
    holdStartedAt: null,
    wrongSinceMs: null,
    phaseEnteredAt: null,
    noteStartedAt: null,
    notesPlayed: state.notesPlayed + 1,
    lastNoteResult: null,
  }
}

/** Force-advance past the current note, e.g. when the player can't produce it or the mic won't register it. */
export function skipCurrentNote(state: DrillState, getNextNote: NoteSource, now: number): DrillState {
  if (state.phase === 'complete') return state
  return advance(state, getNextNote, now)
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
  getNextNote: NoteSource,
  config: DrillConfig = DEFAULT_DRILL_CONFIG,
): DrillState {
  switch (state.phase) {
    case 'complete':
      return state

    case 'awaiting':
    case 'hint': {
      const noteStartedAt = state.noteStartedAt ?? now
      const correct = isCorrect(reading, state.targetNote!, config.toleranceCents)

      if (correct) {
        const holdStartedAt = state.holdStartedAt ?? now
        if (now - holdStartedAt >= config.holdMs) {
          const lastNoteResult: NoteResult = { note: state.targetNote!, delayMs: now - noteStartedAt }
          return config.revealDelayMs <= 0
            ? {
                ...state,
                phase: 'revealed',
                holdStartedAt,
                wrongSinceMs: null,
                phaseEnteredAt: now,
                noteStartedAt,
                lastNoteResult,
              }
            : {
                ...state,
                phase: 'confirmed',
                holdStartedAt,
                wrongSinceMs: null,
                phaseEnteredAt: now,
                noteStartedAt,
                lastNoteResult,
              }
        }
        return { ...state, holdStartedAt, wrongSinceMs: null, noteStartedAt }
      }

      if (reading === null) {
        // Silence: don't punish, but don't let a stray hold carry over either.
        return { ...state, holdStartedAt: null, noteStartedAt }
      }

      const wrongSinceMs = state.wrongSinceMs ?? now
      if (state.phase === 'awaiting' && now - wrongSinceMs >= config.hintTimeoutMs) {
        return { ...state, phase: 'hint', holdStartedAt: null, wrongSinceMs, phaseEnteredAt: now, noteStartedAt }
      }
      return { ...state, holdStartedAt: null, wrongSinceMs, noteStartedAt }
    }

    case 'confirmed': {
      if (now - (state.phaseEnteredAt ?? now) >= config.revealDelayMs) {
        return { ...state, phase: 'revealed', phaseEnteredAt: now }
      }
      return state
    }

    case 'revealed': {
      if (now - (state.phaseEnteredAt ?? now) >= config.advancePauseMs) {
        return advance(state, getNextNote, now)
      }
      return state
    }

    default:
      return state
  }
}
