import { useCallback, useEffect, useRef, useState } from 'react'
import { AudioCapture } from '../audio/audioCapture'
import { A4_HZ, toNote } from '../audio/noteMapper'
import type { NoteReading } from '../audio/types'
import {
  CALIBRATION_COUNTDOWN_MS,
  CALIBRATION_HOLD_MS_PER_NOTE,
  computeCalibration,
  DEFAULT_CALIBRATION_TOLERANCE_CENTS,
  type CalibrationResult,
} from '../audio/calibration'

/**
 * Drives the guided mic-calibration flow: a count-in, then a walk through a
 * fixed list of target notes. For each note the trainer shows what to play and
 * collects cents deviations only while the *correct* note is sounding, until
 * the player has held it for {@link CALIBRATION_HOLD_MS_PER_NOTE} in total.
 *
 * Readings are taken against the base A4 (440, no existing offset) so the
 * result is an absolute calibration that replaces the stored offset rather than
 * stacking on top of it. Owns its own {@link AudioCapture} — like the drill
 * engine — because it needs the cents from every frame, not just the throttled
 * "latest confident note" the main display uses.
 */

export type CalibrationPhase =
  | 'idle'
  | 'requesting'
  | 'countdown'
  | 'listening'
  | 'done'
  | 'error'

export interface BeginOptions {
  /** When true, wrap back to the first note after the last instead of finishing. Defaults to false. */
  loop?: boolean
}

export interface UseCalibration {
  phase: CalibrationPhase
  /** Seconds left on the count-in (3 → 1), only meaningful during 'countdown'. */
  countdown: number
  /** Index of the note currently being collected, into the `targets` passed to {@link begin} (wraps past the list length while looping). */
  targetIndex: number
  /** Hold progress for the current note, 0..1 — drives the fill bar. */
  progress: number
  /** Whether the note being played right now matches the current target. */
  matched: boolean
  /** Latest confident reading, for a live tuning meter. */
  liveNote: NoteReading | null
  /** The computed result once 'done'; null if too few samples were heard. */
  result: CalibrationResult | null
  error: Error | null
  /**
   * Request the mic and begin. `targets` are *concert-pitch* note names (e.g.
   * "C4") to match detected readings against, in order.
   */
  begin: (targets: string[], options?: BeginOptions) => Promise<void>
  /** Abort and release the mic, discarding any progress, returning to 'idle'. */
  cancel: () => void
  /** End the run early (e.g. while looping) and compute the result from samples gathered so far. */
  finishNow: () => void
}

const COUNTDOWN_SECONDS = Math.round(CALIBRATION_COUNTDOWN_MS / 1000)
/** Cap the per-frame hold increment so a long pause between frames can't bank time. */
const MAX_FRAME_GAP_MS = 100

/**
 * @param toleranceCents How close to the target pitch (cents) counts as a
 * match, driven live by the "Accuracy" slider — read fresh each render (like
 * {@link useAudioPitch}'s `a4Hz`) so dragging it mid-hold takes effect
 * immediately without restarting the run.
 */
export function useCalibration(
  toleranceCents: number = DEFAULT_CALIBRATION_TOLERANCE_CENTS,
): UseCalibration {
  const [phase, setPhase] = useState<CalibrationPhase>('idle')
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS)
  const [targetIndex, setTargetIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [matched, setMatched] = useState(false)
  const [liveNote, setLiveNote] = useState<NoteReading | null>(null)
  const [result, setResult] = useState<CalibrationResult | null>(null)
  const [error, setError] = useState<Error | null>(null)

  const captureRef = useRef<AudioCapture | null>(null)
  const targetsRef = useRef<string[]>([])
  const loopRef = useRef(false)
  const indexRef = useRef(0)
  const samplesRef = useRef<number[]>([])
  const holdMsRef = useRef(0)
  const lastMatchTsRef = useRef<number | null>(null)
  const listeningRef = useRef(false)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const toleranceRef = useRef(toleranceCents)
  toleranceRef.current = toleranceCents

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }, [])

  const finish = useCallback(() => {
    listeningRef.current = false
    captureRef.current?.stop()
    setResult(computeCalibration(samplesRef.current))
    setLiveNote(null)
    setMatched(false)
    setPhase('done')
  }, [])

  const onFrame = useCallback(
    (hz: number, clarity: number, timestamp: number) => {
      // Base 440: the measured deviation is exactly what we want to cancel.
      const reading = toNote(hz, clarity, { a4Hz: A4_HZ })
      setLiveNote(reading)
      if (!listeningRef.current) return

      const target = targetsRef.current[indexRef.current % targetsRef.current.length]
      const inTune =
        reading !== null &&
        reading.noteName === target &&
        Math.abs(reading.cents) <= toleranceRef.current
      if (!inTune) {
        // Pause the hold clock on a wrong/absent/too-out-of-tune note without losing progress.
        lastMatchTsRef.current = null
        setMatched(false)
        return
      }

      setMatched(true)
      samplesRef.current.push(reading.cents)
      if (lastMatchTsRef.current !== null) {
        holdMsRef.current += Math.min(timestamp - lastMatchTsRef.current, MAX_FRAME_GAP_MS)
      }
      lastMatchTsRef.current = timestamp

      const p = Math.min(1, holdMsRef.current / CALIBRATION_HOLD_MS_PER_NOTE)
      setProgress(p)

      if (holdMsRef.current >= CALIBRATION_HOLD_MS_PER_NOTE) {
        const next = indexRef.current + 1
        // Without looping, stop once every target has been played once. While
        // looping, keep incrementing forever — the index is taken mod the
        // target count above — so `next` also serves as a lap counter.
        if (next >= targetsRef.current.length && !loopRef.current) {
          finish()
        } else {
          indexRef.current = next
          holdMsRef.current = 0
          lastMatchTsRef.current = null
          setTargetIndex(next)
          setProgress(0)
          setMatched(false)
        }
      }
    },
    [finish],
  )

  const getCapture = useCallback((): AudioCapture => {
    if (!captureRef.current) {
      captureRef.current = new AudioCapture({
        onReading: ({ hz, clarity, timestamp }) => onFrame(hz, clarity, timestamp),
        onStatusChange: (status, err) => {
          if (status === 'error') {
            setError(err ?? new Error('Microphone error'))
            setPhase('error')
          }
        },
      })
    }
    return captureRef.current
  }, [onFrame])

  const cancel = useCallback(() => {
    clearTimers()
    listeningRef.current = false
    captureRef.current?.stop()
    setLiveNote(null)
    setMatched(false)
    setPhase('idle')
  }, [clearTimers])

  /** End a (typically looping) run early, computing the result from samples gathered so far. */
  const finishNow = useCallback(() => {
    if (!listeningRef.current) return
    finish()
  }, [finish])

  const begin = useCallback(
    async (targets: string[], options: BeginOptions = {}) => {
      clearTimers()
      targetsRef.current = targets
      loopRef.current = options.loop ?? false
      indexRef.current = 0
      samplesRef.current = []
      holdMsRef.current = 0
      lastMatchTsRef.current = null
      listeningRef.current = false
      setTargetIndex(0)
      setProgress(0)
      setMatched(false)
      setResult(null)
      setError(null)
      setLiveNote(null)
      setCountdown(COUNTDOWN_SECONDS)
      setPhase('requesting')

      try {
        await getCapture().start()
      } catch {
        // onStatusChange('error') already moved us to the error phase.
        return
      }

      // Count in, ticking the visible number down each second.
      setPhase('countdown')
      for (let remaining = COUNTDOWN_SECONDS - 1; remaining >= 1; remaining -= 1) {
        const secondsElapsed = COUNTDOWN_SECONDS - remaining
        timers.current.push(
          setTimeout(() => setCountdown(remaining), secondsElapsed * 1000),
        )
      }

      // Start listening for the first note once the count-in ends.
      timers.current.push(
        setTimeout(() => {
          listeningRef.current = true
          setPhase('listening')
        }, CALIBRATION_COUNTDOWN_MS),
      )
    },
    [clearTimers, getCapture],
  )

  // Release the mic and drop timers if the screen unmounts mid-run.
  useEffect(() => {
    return () => {
      clearTimers()
      captureRef.current?.stop()
    }
  }, [clearTimers])

  return {
    phase,
    countdown,
    targetIndex,
    progress,
    matched,
    liveNote,
    result,
    error,
    begin,
    cancel,
    finishNow,
  }
}
