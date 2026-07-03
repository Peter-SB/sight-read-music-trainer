/**
 * Horizontal accuracy bar: shows how far the played pitch is from the nearest
 * note, in cents, with the configured acceptance window shaded so it's obvious
 * when a note is close enough to "count". Purely presentational — takes cents
 * and the threshold directly, no audio/instrument deps. Complements the
 * {@link NeedleMeter} with a linear, at-a-glance read of tuning accuracy.
 */

interface AccuracyBarProps {
  /** Cents deviation from the nearest note, -50..+50. Null when nothing confident is heard. */
  cents: number | null
  /** Absolute cents within which a note is accepted as in tune (the shaded window). */
  toleranceCents: number
}

const CLAMP_CENTS = 50

/** Map a cents value in [-CLAMP, +CLAMP] to a 0..100% horizontal position. */
function toPercent(cents: number): number {
  const clamped = Math.max(-CLAMP_CENTS, Math.min(CLAMP_CENTS, cents))
  return ((clamped + CLAMP_CENTS) / (CLAMP_CENTS * 2)) * 100
}

export function AccuracyBar({ cents, toleranceCents }: AccuracyBarProps) {
  const inTune = cents !== null && Math.abs(cents) <= toleranceCents
  const state = cents === null ? 'idle' : inTune ? 'in-tune' : cents > 0 ? 'sharp' : 'flat'

  const zoneLeft = toPercent(-toleranceCents)
  const zoneWidth = toPercent(toleranceCents) - zoneLeft

  return (
    <div className={`accuracy-bar accuracy-bar--${state}`}>
      <div
        className="accuracy-bar__track"
        role="meter"
        aria-valuemin={-CLAMP_CENTS}
        aria-valuemax={CLAMP_CENTS}
        aria-valuenow={cents ?? 0}
        aria-label="Pitch accuracy in cents"
      >
        <span
          className="accuracy-bar__zone"
          style={{ left: `${zoneLeft}%`, width: `${zoneWidth}%` }}
          aria-hidden="true"
        />
        <span className="accuracy-bar__center" aria-hidden="true" />
        {cents !== null && (
          <span className="accuracy-bar__marker" style={{ left: `${toPercent(cents)}%` }} />
        )}
      </div>
      <div className="accuracy-bar__scale" aria-hidden="true">
        <span>♭ 50¢</span>
        <span className="accuracy-bar__reading">
          {cents === null ? '—' : inTune ? 'in tune' : `${cents > 0 ? '+' : ''}${cents}¢`}
        </span>
        <span>50¢ ♯</span>
      </div>
    </div>
  )
}
