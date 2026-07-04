import { useEffect, useMemo } from 'react'
import { calibratedA4Hz, formatNoteNameForDisplay } from '../audio/noteMapper'
import { concertToWrittenNoteName, toConcertNoteName } from '../audio/transposition'
import type { InstrumentId } from '../config/instruments'
import { SCALES, type ScaleId } from '../config/scales'
import { fingeringRevealToMs, type FingeringReveal } from '../config/settings'
import { generateScale, shuffleSequence } from '../drill/scaleGenerator'
import { createAdaptiveNoteSource, createSequentialNoteSource } from '../drill/adaptiveNoteSource'
import { DEFAULT_DRILL_CONFIG, type DrillConfig } from '../drill/drillStateMachine'
import { AccuracyBar } from './AccuracyBar'
import { FingeringDiagram } from './FingeringDiagram'
import { HoldIndicator } from './HoldIndicator'
import { NeedleMeter } from './NeedleMeter'
import { SheetMusic } from './SheetMusic'
import { TuningSlider } from './TuningSlider'
import { useDrillEngine } from './useDrillEngine'

interface ScaleDrillViewProps {
  instrument: InstrumentId
  scaleId: ScaleId
  rootPitchClass: string
  rangeLow: string
  rangeHigh: string
  /** Walk the scale in random order instead of ascending. */
  randomOrder: boolean
  /** 0 = deterministic sequential drill; 1-5 = increasing bias toward slow-scoring notes. */
  adaptiveWeight: number
  holdMs: number
  /** Max absolute cents deviation still accepted as the target note. */
  acceptanceThresholdCents: number
  fingeringReveal: FingeringReveal
  tuningOffsetCents: number
  onTuningOffsetChange: (tuningOffsetCents: number) => void
  onExit: () => void
}

export function ScaleDrillView({
  instrument,
  scaleId,
  rootPitchClass,
  rangeLow,
  rangeHigh,
  randomOrder,
  adaptiveWeight,
  holdMs,
  acceptanceThresholdCents,
  fingeringReveal,
  tuningOffsetCents,
  onTuningOffsetChange,
  onExit,
}: ScaleDrillViewProps) {
  const pool = useMemo(() => {
    const low = toConcertNoteName(rangeLow, instrument)
    const high = toConcertNoteName(rangeHigh, instrument)
    if (!low || !high) return []
    return generateScale(rootPitchClass, scaleId, { low, high })
  }, [instrument, rootPitchClass, scaleId, rangeLow, rangeHigh])

  // Endless note source: sequential up-down walk when adaptive weighting is off,
  // otherwise a live-reweighted random draw biased toward slow-scoring notes.
  const noteSource = useMemo(() => {
    if (adaptiveWeight > 0) return createAdaptiveNoteSource(pool, adaptiveWeight)
    const orderedPool = randomOrder ? shuffleSequence(pool) : pool
    return createSequentialNoteSource(orderedPool)
  }, [pool, adaptiveWeight, randomOrder])

  const config: DrillConfig = useMemo(
    () => ({
      ...DEFAULT_DRILL_CONFIG,
      holdMs,
      toleranceCents: acceptanceThresholdCents,
      revealDelayMs: fingeringRevealToMs(fingeringReveal),
    }),
    [holdMs, acceptanceThresholdCents, fingeringReveal],
  )

  const { status, error, reading, drillState, start, stop, skip } = useDrillEngine(
    noteSource,
    config,
    calibratedA4Hz(tuningOffsetCents),
  )

  useEffect(() => {
    void start()
    return () => stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const running = status === 'running'
  // fingeringReveal === 0 ("always on") shows the chart the instant the target note appears,
  // rather than waiting for it to be played correctly like the delayed/hint reveals do.
  const showFingering =
    fingeringReveal !== 'off' &&
    (fingeringReveal === 0 || drillState.phase === 'revealed' || drillState.phase === 'hint')

  const targetWritten = drillState.targetNote
    ? concertToWrittenNoteName(drillState.targetNote, instrument)
    : null

  const readingWritten = reading ? concertToWrittenNoteName(reading.noteName, instrument) : null

  if (pool.length === 0) {
    return (
      <div className="drill">
        <p>Couldn't build a note sequence for this scale/range combination.</p>
        <button type="button" onClick={onExit}>
          Back
        </button>
      </div>
    )
  }

  return (
    <div className="drill">
      <header className="drill__header">
        <button type="button" className="link-button" onClick={onExit}>
          ← Exit drill
        </button>
        <span className="drill__scale-label">
          {rootPitchClass} {SCALES[scaleId].label}
          {adaptiveWeight === 0 && randomOrder ? ' · Random order' : ''}
        </span>
      </header>

      {error && (
        <div className="banner banner--error" role="alert">
          Microphone unavailable: {error.message}
        </div>
      )}

      <div className="drill__progress">
        Note {drillState.notesPlayed + 1}
      </div>

      <div className="stage">
        <div className="note-display">
          <span className="note-name">
            {targetWritten ? formatNoteNameForDisplay(targetWritten) : '—'}
          </span>
          {targetWritten && (
            <SheetMusic
              notes={[formatNoteNameForDisplay(targetWritten)]}
              className="note-display__staff"
            />
          )}
          <span className="note-detail">{phaseLabel(drillState.phase)}</span>
          <HoldIndicator holdStartedAt={drillState.holdStartedAt} holdMs={config.holdMs} />
        </div>
        <FingeringDiagram
          concertNoteName={showFingering ? drillState.targetNote : null}
          instrument={instrument}
        />
      </div>

      <button
        type="button"
        className="mic-button drill__skip"
        disabled={drillState.phase === 'complete'}
        onClick={skip}
      >
        Skip note
      </button>

      <NeedleMeter
        cents={reading?.cents ?? null}
        noteName={readingWritten ? formatNoteNameForDisplay(readingWritten) : null}
        toleranceCents={config.toleranceCents}
      />
      <AccuracyBar cents={reading?.cents ?? null} toleranceCents={config.toleranceCents} />
      <TuningSlider valueCents={tuningOffsetCents} onChange={onTuningOffsetChange} />

      <footer className="app__footer">
        <span className={`status-dot status-dot--${status}`} aria-hidden="true" />
        {running ? 'Listening' : status === 'requesting' ? 'Requesting mic…' : 'Not listening'}
      </footer>
    </div>
  )
}

function phaseLabel(phase: string): string {
  switch (phase) {
    case 'awaiting':
      return 'Play this note'
    case 'confirmed':
      return 'Nice — holding…'
    case 'revealed':
      return 'Correct!'
    case 'hint':
      return "Here's the fingering — keep trying"
    default:
      return ''
  }
}
