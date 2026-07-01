import { useCallback, useEffect, useRef, useState } from 'react'
import { AudioCapture, type CaptureStatus } from '../audio/audioCapture'
import { toNote } from '../audio/noteMapper'
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

export function useAudioPitch(): UseAudioPitch {
  const [status, setStatus] = useState<CaptureStatus>('idle')
  const [error, setError] = useState<Error | null>(null)
  const [note, setNote] = useState<NoteReading | null>(null)

  const captureRef = useRef<AudioCapture | null>(null)
  const staleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const getCapture = useCallback((): AudioCapture => {
    if (!captureRef.current) {
      captureRef.current = new AudioCapture({
        onReading: ({ hz, clarity }) => {
          const reading = toNote(hz, clarity)
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
