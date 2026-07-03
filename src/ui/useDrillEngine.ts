import { useCallback, useEffect, useRef, useState } from 'react'
import { AudioCapture, type CaptureStatus } from '../audio/audioCapture'
import { A4_HZ, toNote } from '../audio/noteMapper'
import type { NoteReading } from '../audio/types'
import {
  createDrillState,
  updateDrill,
  type DrillConfig,
  type DrillState,
} from '../drill/drillStateMachine'

/**
 * React binding for the drill: owns its own mic capture (separate from
 * {@link useAudioPitch}) because the state machine needs *every* analysed
 * frame — including wrong-note and silence frames — not just confident
 * readings, to drive hint timeouts and hold-progress resets correctly.
 */

export interface UseDrillEngine {
  status: CaptureStatus
  error: Error | null
  /** Latest concert-pitch reading for this frame, or null. */
  reading: NoteReading | null
  drillState: DrillState
  start: () => Promise<void>
  stop: () => void
  restart: () => void
}

/** @param a4Hz Calibration reference pitch — see {@link calibratedA4Hz}. Defaults to standard 440. */
export function useDrillEngine(
  sequence: string[],
  config: DrillConfig,
  a4Hz: number = A4_HZ,
): UseDrillEngine {
  const [status, setStatus] = useState<CaptureStatus>('idle')
  const [error, setError] = useState<Error | null>(null)
  const [reading, setReading] = useState<NoteReading | null>(null)
  const [drillState, setDrillState] = useState<DrillState>(() =>
    createDrillState(sequence),
  )

  const drillStateRef = useRef(drillState)
  const configRef = useRef(config)
  const captureRef = useRef<AudioCapture | null>(null)
  // Read fresh each frame without recreating AudioCapture (and dropping the mic) on every slider tick.
  const a4HzRef = useRef(a4Hz)
  a4HzRef.current = a4Hz

  useEffect(() => {
    configRef.current = config
  }, [config])

  useEffect(() => {
    const fresh = createDrillState(sequence)
    drillStateRef.current = fresh
    setDrillState(fresh)
  }, [sequence])

  const getCapture = useCallback((): AudioCapture => {
    if (!captureRef.current) {
      captureRef.current = new AudioCapture({
        onReading: ({ hz, clarity, timestamp }) => {
          const noteReading = toNote(hz, clarity, { a4Hz: a4HzRef.current })
          setReading(noteReading)
          const next = updateDrill(
            drillStateRef.current,
            noteReading,
            timestamp,
            configRef.current,
          )
          drillStateRef.current = next
          setDrillState(next)
        },
        onStatusChange: (next, err) => {
          setStatus(next)
          setError(err ?? null)
        },
      })
    }
    return captureRef.current
  }, [])

  const start = useCallback(async () => {
    setError(null)
    await getCapture().start()
  }, [getCapture])

  const stop = useCallback(() => {
    captureRef.current?.stop()
  }, [])

  const restart = useCallback(() => {
    const fresh = createDrillState(sequence)
    drillStateRef.current = fresh
    setDrillState(fresh)
  }, [sequence])

  useEffect(() => {
    return () => {
      captureRef.current?.stop()
    }
  }, [])

  return { status, error, reading, drillState, start, stop, restart }
}
