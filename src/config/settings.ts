import { DEFAULT_INSTRUMENT, type InstrumentId } from './instruments'
import type { ScaleId } from './scales'

/** Whether the picked scale root pitch class is concert pitch or as read on the selected instrument. */
export type KeyMode = 'concert' | 'written'

/**
 * Session settings: the small set of knobs the MVP exposes, per the design
 * doc's "basic session settings" bullet. Kept flat and serialisable so it can
 * be persisted (e.g. localStorage) later without restructuring.
 */

/** Seconds of delay before the fingering chart reveals, or 'off' = never shown. 0 = always on. */
export type FingeringReveal = 0 | 1 | 2 | 3 | 'off'

export interface SessionSettings {
  instrument: InstrumentId
  /** Written note-range bounds (per instrument), inclusive. */
  rangeLow: string
  rangeHigh: string
  /** How long the correct pitch must be held (ms) before it's confirmed. */
  holdMs: number
  /** Max absolute cents deviation still accepted as the target note (in tune). */
  acceptanceThresholdCents: number
  fingeringReveal: FingeringReveal
  /** Mic calibration, in cents (±{@link MAX_CALIBRATION_CENTS}) — see {@link calibratedA4Hz}. */
  tuningOffsetCents: number
  /** Last scale picked on the Scales page, so it's preselected next visit. */
  lastScaleId: ScaleId
  lastScaleRoot: string
  lastScaleKeyMode: KeyMode
  lastScaleRangeLow: string
  lastScaleRangeHigh: string
}

export const DEFAULT_SETTINGS: SessionSettings = {
  instrument: DEFAULT_INSTRUMENT,
  rangeLow: 'Bb3',
  rangeHigh: 'F6',
  holdMs: 400,
  acceptanceThresholdCents: 20,
  fingeringReveal: 1,
  tuningOffsetCents: 0,
  lastScaleId: 'major',
  lastScaleRoot: 'C',
  lastScaleKeyMode: 'concert',
  lastScaleRangeLow: 'Bb3',
  lastScaleRangeHigh: 'F6',
}

/** Inclusive bounds for {@link SessionSettings.acceptanceThresholdCents} (a looser or stricter "in tune" window). */
export const MIN_ACCEPTANCE_CENTS = 5
export const MAX_ACCEPTANCE_CENTS = 50

/** Convert a {@link FingeringReveal} setting to the milliseconds the drill's confirm→reveal delay should use. */
export function fingeringRevealToMs(reveal: FingeringReveal): number {
  return reveal === 'off' ? 0 : reveal * 1000
}
