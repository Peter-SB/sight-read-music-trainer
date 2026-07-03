import { useMemo, useState } from 'react'
import { formatNoteNameForDisplay } from '../audio/noteMapper'
import { concertToWrittenNoteName, toConcertNoteName } from '../audio/transposition'
import {
  CALIBRATION_TARGET_NOTES,
  DEFAULT_CALIBRATION_TOLERANCE_CENTS,
  MAX_CALIBRATION_TOLERANCE_CENTS,
  MIN_CALIBRATION_SAMPLES,
  MIN_CALIBRATION_TOLERANCE_CENTS,
} from '../audio/calibration'
import type { InstrumentId } from '../config/instruments'
import { INSTRUMENTS } from '../config/instruments'
import { FingeringDiagram } from './FingeringDiagram'
import { NeedleMeter } from './NeedleMeter'
import { useCalibration } from './useCalibration'

/**
 * Mic-calibration screen. Walks the player through a fixed list of notes — the
 * trainer names each one and shows its fingering, the player sustains it — and
 * measures the setup's consistent tuning bias, then offers to save the
 * correcting offset into session settings.
 */

interface CalibrationViewProps {
  instrument: InstrumentId
  /** Current stored offset, shown for reference on the intro screen. */
  currentOffsetCents: number
  /** Persist the measured offset. */
  onApply: (offsetCents: number) => void
  onBack: () => void
}

export function CalibrationView({
  instrument,
  currentOffsetCents,
  onApply,
  onBack,
}: CalibrationViewProps) {
  // How close to the target pitch counts as a match, live-adjustable via the
  // "Accuracy" slider under the hold-progress bar — widen it to accept rougher
  // intonation, e.g. for a beginner who can't yet land dead-on.
  const [toleranceCents, setToleranceCents] = useState(DEFAULT_CALIBRATION_TOLERANCE_CENTS)

  const {
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
  } = useCalibration(toleranceCents)

  // Loop forever through the note list by default, so the player can settle in
  // and calibrate over as many passes as they like rather than a single fixed run.
  const [repeatEndless, setRepeatEndless] = useState(true)

  // The written notes we prompt for, paired with the concert names used to
  // match readings and look up fingerings.
  const targets = useMemo(
    () =>
      CALIBRATION_TARGET_NOTES.map((written) => ({
        written,
        concert: toConcertNoteName(written, instrument),
      })).filter((t): t is { written: string; concert: string } => t.concert !== null),
    [instrument],
  )

  const start = () => void begin(targets.map((t) => t.concert), { loop: repeatEndless })

  const current = targets.length > 0 ? targets[targetIndex % targets.length] : undefined

  const writtenNote = liveNote
    ? concertToWrittenNoteName(liveNote.noteName, instrument)
    : null
  const liveNoteLabel = writtenNote ? formatNoteNameForDisplay(writtenNote) : null

  return (
    <div className="calibration">
      <header className="page__header">
        <button
          type="button"
          className="link-button"
          onClick={() => {
            cancel()
            onBack()
          }}
        >
          ← Back
        </button>
        <h2>Calibrate microphone</h2>
      </header>

      {error && (
        <div className="banner banner--error" role="alert">
          Microphone unavailable: {error.message}
        </div>
      )}

      {phase === 'idle' && (
        <div className="calibration__intro">
          <p>
            The trainer will name {targets.length} notes for you to play on your{' '}
            {INSTRUMENTS[instrument].label}. It measures how sharp or flat your setup reads so
            it can correct for it.
          </p>
          <ol className="calibration__steps">
            <li>Tune up first so you're playing in tune.</li>
            <li>Play each note it shows — the fingering is displayed.</li>
            <li>Hold each steady until its bar fills, then it moves on.</li>
          </ol>
          <p className="calibration__notes-list">
            Notes: {targets.map((t) => formatNoteNameForDisplay(t.written)).join('  ·  ')}
          </p>
          <p className="calibration__current">
            Current calibration: {formatOffset(currentOffsetCents)}
          </p>
          <button
            type="button"
            role="switch"
            aria-checked={repeatEndless}
            className={`pill-toggle ${repeatEndless ? 'pill-toggle--on' : ''}`}
            onClick={() => setRepeatEndless((v) => !v)}
          >
            <span className="pill-toggle__knob" aria-hidden="true" />
            Repeat endlessly
          </button>
          <button type="button" className="mic-button" onClick={start}>
            Start calibration
          </button>
        </div>
      )}

      {phase === 'requesting' && (
        <p className="calibration__hint">Requesting microphone…</p>
      )}

      {phase === 'countdown' && (
        <div className="calibration__countdown">
          <div className="calibration__count" aria-live="assertive">
            {countdown}
          </div>
          <p className="calibration__hint">Get ready to play…</p>
        </div>
      )}

      {phase === 'listening' && current && (
        <div className="calibration__sampling">
          <p className="calibration__progress">
            {repeatEndless
              ? `Note ${(targetIndex % targets.length) + 1} of ${targets.length} · Lap ${Math.floor(targetIndex / targets.length) + 1}`
              : `Note ${targetIndex + 1} of ${targets.length}`}
          </p>
          <div className="calibration__target">
            <span className="calibration__target-name">
              {formatNoteNameForDisplay(current.written)}
            </span>
            <span className="calibration__hint">
              {matched ? 'Hold it…' : 'Play this note'}
            </span>
          </div>
          <div className="calibration__stage">
            {/* Instant fingering: shown the moment the note is prompted. */}
            <FingeringDiagram concertNoteName={current.concert} instrument={instrument} />
            <NeedleMeter cents={liveNote?.cents ?? null} noteName={liveNoteLabel} />
          </div>
          <div className="calibration__bar" aria-hidden="true">
            <div
              className={`calibration__bar-fill ${matched ? 'calibration__bar-fill--active' : ''}`}
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
          <label className="accuracy-slider">
            <span className="accuracy-slider__label">Accuracy</span>
            <input
              type="range"
              min={MIN_CALIBRATION_TOLERANCE_CENTS}
              max={MAX_CALIBRATION_TOLERANCE_CENTS}
              step={5}
              value={toleranceCents}
              onChange={(e) => setToleranceCents(Number(e.target.value))}
              className="accuracy-slider__input"
              aria-label="Accuracy tolerance"
            />
            <span className="accuracy-slider__value">±{toleranceCents}¢</span>
          </label>
          {repeatEndless && (
            <button type="button" className="link-button" onClick={finishNow}>
              Stop &amp; see results
            </button>
          )}
        </div>
      )}

      {phase === 'done' && (
        <div className="calibration__result">
          {result ? (
            <>
              <h3>
                {result.measuredCents === 0
                  ? 'Spot on'
                  : `Your setup reads ${formatOffset(result.measuredCents)}`}
              </h3>
              <p>
                Suggested calibration: <strong>{formatOffset(result.offsetCents)}</strong>
                {result.clamped && (
                  <span className="calibration__note">
                    {' '}
                    (limited to the max — check your tuning if notes still read off)
                  </span>
                )}
              </p>
              <p className="calibration__samples">
                Measured from {result.sampleCount} samples across {targets.length} notes.
              </p>
              <div className="calibration__actions">
                <button
                  type="button"
                  className="mic-button"
                  onClick={() => {
                    onApply(result.offsetCents)
                    onBack()
                  }}
                >
                  Save &amp; apply
                </button>
                <button type="button" className="link-button" onClick={start}>
                  Redo
                </button>
              </div>
            </>
          ) : (
            <>
              <h3>Didn't hear enough</h3>
              <p>
                We didn't catch enough steady notes (need {MIN_CALIBRATION_SAMPLES} samples).
                Play a little louder and hold each note through the whole bar.
              </p>
              <div className="calibration__actions">
                <button type="button" className="mic-button" onClick={start}>
                  Try again
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

/** Render a cents value with an explicit sign and unit (e.g. "+3¢", "0¢"). */
function formatOffset(cents: number): string {
  if (cents === 0) return '0¢'
  return `${cents > 0 ? '+' : ''}${cents}¢`
}
