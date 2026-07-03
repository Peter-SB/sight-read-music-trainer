import { useCallback, useEffect, useRef, useState } from 'react'
import { AudioCapture, type CaptureStatus } from '../audio/audioCapture'
import { A4_HZ, toNote } from '../audio/noteMapper'
import type { NoteReading } from '../audio/types'

/**
 * React binding for {@link AudioCapture}: exposes mic status plus the latest
 * concert-pitch note reading. Transposition/display stays in the UI layer.
 */

/** Clear the displayed note this long after the last confident reading. */
const STALE_MS = 400

export interface UseAudioPitch {
  status: CaptureStatus
  error: Error | null
  /** Latest confident reading in concert pitch, or null when nothing is heard. */
  note: NoteReading | null
  start: () => Promise<void>
  stop: () => void
}

/** @param a4Hz Calibration reference pitch — see {@link calibratedA4Hz}. Defaults to standard 440. */
export function useAudioPitch(a4Hz: number = A4_HZ): UseAudioPitch {
  const [status, setStatus] = useState<CaptureStatus>('idle')
  const [error, setError] = useState<Error | null>(null)
  const [note, setNote] = useState<NoteReading | null>(null)

  const captureRef = useRef<AudioCapture | null>(null)
  const staleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Read fresh each frame without recreating AudioCapture (and dropping the mic) on every slider tick.
  const a4HzRef = useRef(a4Hz)
  a4HzRef.current = a4Hz

  const getCapture = useCallback((): AudioCapture => {
    if (!captureRef.current) {
      captureRef.current = new AudioCapture({
        onReading: ({ hz, clarity }) => {
          const reading = toNote(hz, clarity, { a4Hz: a4HzRef.current })
          if (!reading) return
          setNote(reading)
          if (staleTimer.current) clearTimeout(staleTimer.current)
          staleTimer.current = setTimeout(() => setNote(null), STALE_MS)
        },
        onStatusChange: (next, err) => {
          setStatus(next)
          setError(err ?? null)
          if (next !== 'running') setNote(null)
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

  // Tear down the mic on unmount.
  useEffect(() => {
    return () => {
      if (staleTimer.current) clearTimeout(staleTimer.current)
      captureRef.current?.stop()
    }
  }, [])

  return { status, error, note, start, stop }
}
