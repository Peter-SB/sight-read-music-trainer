import { MAX_CALIBRATION_CENTS } from '../audio/noteMapper'
import { INSTRUMENTS } from './instruments'
import { SCALES } from './scales'
import {
  DEFAULT_SETTINGS,
  MAX_ACCEPTANCE_CENTS,
  MAX_ADAPTIVE_WEIGHT,
  MIN_ACCEPTANCE_CENTS,
  MIN_ADAPTIVE_WEIGHT,
  type FingeringReveal,
  type KeyMode,
  type SessionSettings,
} from './settings'

/**
 * Persists {@link SessionSettings} across visits via localStorage (a cookie
 * would ride along on every request for no benefit here — there's no server
 * to read it). Every read is sanitized field-by-field against
 * {@link DEFAULT_SETTINGS} rather than trusted wholesale, so a settings shape
 * change between app versions (or hand-edited storage) degrades to defaults
 * for the affected fields instead of crashing the app on load.
 */

const STORAGE_KEY = 'sax-practice-trainer:settings'

/** Load persisted settings, falling back to {@link DEFAULT_SETTINGS} if nothing's stored or it's unusable. */
export function loadSettings(): SessionSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SETTINGS
    return sanitizeSettings(JSON.parse(raw))
  } catch {
    return DEFAULT_SETTINGS
  }
}

/** Persist settings. Silently no-ops if storage is unavailable (private browsing, quota, SSR). */
export function saveSettings(settings: SessionSettings): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Storage unavailable — the session still works in-memory for this visit.
  }
}

function isValidFingeringReveal(value: unknown): value is FingeringReveal {
  return value === 'off' || value === 0 || value === 1 || value === 2 || value === 3
}

function isValidKeyMode(value: unknown): value is KeyMode {
  return value === 'concert' || value === 'written'
}

/** Fill in/override anything missing, mistyped, or out of range with the corresponding default. */
export function sanitizeSettings(parsed: unknown): SessionSettings {
  if (typeof parsed !== 'object' || parsed === null) return DEFAULT_SETTINGS
  const p = parsed as Partial<Record<keyof SessionSettings, unknown>>

  return {
    instrument:
      typeof p.instrument === 'string' && p.instrument in INSTRUMENTS
        ? (p.instrument as SessionSettings['instrument'])
        : DEFAULT_SETTINGS.instrument,
    rangeLow: typeof p.rangeLow === 'string' ? p.rangeLow : DEFAULT_SETTINGS.rangeLow,
    rangeHigh: typeof p.rangeHigh === 'string' ? p.rangeHigh : DEFAULT_SETTINGS.rangeHigh,
    holdMs:
      typeof p.holdMs === 'number' && Number.isFinite(p.holdMs)
        ? p.holdMs
        : DEFAULT_SETTINGS.holdMs,
    acceptanceThresholdCents:
      typeof p.acceptanceThresholdCents === 'number' && Number.isFinite(p.acceptanceThresholdCents)
        ? Math.max(
            MIN_ACCEPTANCE_CENTS,
            Math.min(MAX_ACCEPTANCE_CENTS, Math.round(p.acceptanceThresholdCents)),
          )
        : DEFAULT_SETTINGS.acceptanceThresholdCents,
    fingeringReveal: isValidFingeringReveal(p.fingeringReveal)
      ? p.fingeringReveal
      : DEFAULT_SETTINGS.fingeringReveal,
    tuningOffsetCents:
      typeof p.tuningOffsetCents === 'number' && Number.isFinite(p.tuningOffsetCents)
        ? Math.max(-MAX_CALIBRATION_CENTS, Math.min(MAX_CALIBRATION_CENTS, p.tuningOffsetCents))
        : DEFAULT_SETTINGS.tuningOffsetCents,
    lastScaleId:
      typeof p.lastScaleId === 'string' && p.lastScaleId in SCALES
        ? (p.lastScaleId as SessionSettings['lastScaleId'])
        : DEFAULT_SETTINGS.lastScaleId,
    lastScaleRoot:
      typeof p.lastScaleRoot === 'string' ? p.lastScaleRoot : DEFAULT_SETTINGS.lastScaleRoot,
    lastScaleKeyMode: isValidKeyMode(p.lastScaleKeyMode)
      ? p.lastScaleKeyMode
      : DEFAULT_SETTINGS.lastScaleKeyMode,
    lastScaleRangeLow:
      typeof p.lastScaleRangeLow === 'string'
        ? p.lastScaleRangeLow
        : DEFAULT_SETTINGS.lastScaleRangeLow,
    lastScaleRangeHigh:
      typeof p.lastScaleRangeHigh === 'string'
        ? p.lastScaleRangeHigh
        : DEFAULT_SETTINGS.lastScaleRangeHigh,
    adaptiveWeight:
      typeof p.adaptiveWeight === 'number' && Number.isFinite(p.adaptiveWeight)
        ? Math.max(MIN_ADAPTIVE_WEIGHT, Math.min(MAX_ADAPTIVE_WEIGHT, Math.round(p.adaptiveWeight)))
        : DEFAULT_SETTINGS.adaptiveWeight,
  }
}
