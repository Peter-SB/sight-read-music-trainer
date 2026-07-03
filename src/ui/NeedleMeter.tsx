/**
 * Tuning-accuracy needle: sweeps -50..+50 cents (flat..sharp) around a fixed
 * dial. Purely presentational — takes cents directly, no audio/instrument deps.
 */

interface NeedleMeterProps {
  /** Cents deviation, -50..+50. Null when nothing confident is being heard. */
  cents: number | null
  /** The currently analysed note, already formatted for display (e.g. "D♯5"). Null when nothing confident is being heard. */
  noteName?: string | null
  /** Cents within which the needle counts as "in tune" (for coloring). */
  toleranceCents?: number
}

const CLAMP_CENTS = 50

export function NeedleMeter({ cents, noteName = null, toleranceCents = 10 }: NeedleMeterProps) {
  const clamped = cents === null ? 0 : Math.max(-CLAMP_CENTS, Math.min(CLAMP_CENTS, cents))
  const angle = (clamped / CLAMP_CENTS) * 45 // -45deg..+45deg sweep

  const state =
    cents === null
      ? 'idle'
      : Math.abs(cents) <= toleranceCents
        ? 'in-tune'
        : cents > 0
          ? 'sharp'
          : 'flat'

  return (
    <div className={`needle-meter needle-meter--${state}`}>
      <div className="needle-meter__row">
        <span className="needle-meter__note" aria-hidden="true">
          {noteName ?? '—'}
        </span>
        <svg viewBox="0 0 200 110" className="needle-meter__dial" role="img" aria-label={`Tuning meter${noteName ? `, currently ${noteName}` : ''}`}>
          <path d="M 10 100 A 90 90 0 0 1 190 100" className="needle-meter__arc" />
          <line x1="90" y1="18" x2="90" y2="10" className="needle-meter__tick" />
          <line x1="55" y1="24" x2="50" y2="17" className="needle-meter__tick" />
          <line x1="145" y1="24" x2="150" y2="17" className="needle-meter__tick" />
          <line
            x1="100"
            y1="100"
            x2="100"
            y2="25"
            className="needle-meter__needle"
            transform={`rotate(${angle} 100 100)`}
          />
          <circle cx="100" cy="100" r="6" className="needle-meter__pivot" />
        </svg>
      </div>
      <span className="needle-meter__label">
        {cents === null ? '—' : `${cents > 0 ? '+' : ''}${cents}¢`}
      </span>
    </div>
  )
}
