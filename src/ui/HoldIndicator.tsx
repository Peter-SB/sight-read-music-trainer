import { useEffect, useRef, useState } from 'react'

/**
 * Hold-to-confirm progress: while the target pitch is being held in tune, a bar
 * fills left-to-right and a countdown ticks down to zero, at which point the
 * note is confirmed and the drill advances. Driven by requestAnimationFrame off
 * the same `performance.now()` clock the drill stamps its readings with, so the
 * bar and countdown stay in step with the state machine's hold accounting.
 */

interface HoldIndicatorProps {
  /** performance.now() timestamp the current hold began, or null when nothing is being held. */
  holdStartedAt: number | null
  /** How long the hold must last (ms) before it counts as confirmed. */
  holdMs: number
}

export function HoldIndicator({ holdStartedAt, holdMs }: HoldIndicatorProps) {
  // Elapsed ms into the current hold; 0 when nothing is held.
  const [elapsed, setElapsed] = useState(0)
  const frameRef = useRef<number | null>(null)

  useEffect(() => {
    if (holdStartedAt === null || holdMs <= 0) {
      setElapsed(0)
      return
    }
    const tick = () => {
      setElapsed(Math.min(holdMs, performance.now() - holdStartedAt))
      frameRef.current = requestAnimationFrame(tick)
    }
    frameRef.current = requestAnimationFrame(tick)
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    }
  }, [holdStartedAt, holdMs])

  const holding = holdStartedAt !== null && holdMs > 0
  const progress = holding ? elapsed / holdMs : 0
  const remainingS = holding ? Math.max(0, (holdMs - elapsed) / 1000) : holdMs / 1000

  return (
    <div className={`hold-indicator ${holding ? 'hold-indicator--active' : ''}`}>
      <div
        className="hold-indicator__track"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        aria-label="Hold progress"
      >
        <div className="hold-indicator__fill" style={{ width: `${progress * 100}%` }} />
      </div>
      <span className="hold-indicator__countdown" aria-hidden="true">
        {holdMs <= 0 ? 'instant' : `${remainingS.toFixed(1)}s`}
      </span>
    </div>
  )
}
