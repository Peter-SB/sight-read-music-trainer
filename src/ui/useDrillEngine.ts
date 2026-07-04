import { useCallback, useEffect, useRef, useState } from 'react'
import { AudioCapture, type CaptureStatus } from '../audio/audioCapture'
import { A4_HZ, toNote } from '../audio/noteMapper'
import type { NoteReading } from '../audio/types'
import { recordNoteDelay } from '../drill/noteScores'
import {
  createDrillState,
  skipCurrentNote,
  updateDrill,
  type DrillConfig,
  type DrillState,
  type NoteSource,
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
  /** Force-advance past the current note when the player can't produce it or the mic won't register it. */
  skip: () => void
}

/** @param a4Hz Calibration reference pitch — see {@link calibratedA4Hz}. Defaults to standard 440. */
export function useDrillEngine(
  noteSource: NoteSource,
  config: DrillConfig,
  a4Hz: number = A4_HZ,
): UseDrillEngine {
  const [status, setStatus] = useState<CaptureStatus>('idle')
  const [error, setError] = useState<Error | null>(null)
  const [reading, setReading] = useState<NoteReading | null>(null)
  const [drillState, setDrillState] = useState<DrillState>(() =>
    createDrillState(noteSource),
  )

  const drillStateRef = useRef(drillState)
  const configRef = useRef(config)
  const noteSourceRef = useRef(noteSource)
  const captureRef = useRef<AudioCapture | null>(null)
  // Read fresh each frame without recreating AudioCapture (and dropping the mic) on every slider tick.
  const a4HzRef = useRef(a4Hz)
  a4HzRef.current = a4Hz

  useEffect(() => {
    configRef.current = config
  }, [config])

  useEffect(() => {
    noteSourceRef.current = noteSource
  }, [noteSource])

  useEffect(() => {
    const fresh = createDrillState(noteSource)
    drillStateRef.current = fresh
    setDrillState(fresh)
  }, [noteSource])

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
            noteSourceRef.current,
            configRef.current,
          )
          if (
            next.lastNoteResult !== null &&
            next.lastNoteResult !== drillStateRef.current.lastNoteResult
          ) {
            recordNoteDelay(next.lastNoteResult.note, next.lastNoteResult.delayMs)
          }
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
    const fresh = createDrillState(noteSource)
    drillStateRef.current = fresh
    setDrillState(fresh)
  }, [noteSource])

  const skip = useCallback(() => {
    const next = skipCurrentNote(drillStateRef.current, noteSourceRef.current, performance.now())
    drillStateRef.current = next
    setDrillState(next)
  }, [])

  useEffect(() => {
    return () => {
      captureRef.current?.stop()
    }
  }, [])

  return { status, error, reading, drillState, start, stop, restart, skip }
}
