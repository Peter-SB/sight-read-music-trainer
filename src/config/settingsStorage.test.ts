import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MAX_CALIBRATION_CENTS } from '../audio/noteMapper'
import { DEFAULT_SETTINGS } from './settings'
import { loadSettings, sanitizeSettings, saveSettings } from './settingsStorage'

/** Minimal in-memory Storage stand-in — Node has no localStorage by default. */
class MemoryStorage implements Storage {
  private store = new Map<string, string>()
  get length() {
    return this.store.size
  }
  clear(): void {
    this.store.clear()
  }
  getItem(key: string): string | null {
    return this.store.get(key) ?? null
  }
  key(index: number): string | null {
    return [...this.store.keys()][index] ?? null
  }
  removeItem(key: string): void {
    this.store.delete(key)
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value)
  }
}

beforeEach(() => {
  vi.stubGlobal('window', { localStorage: new MemoryStorage() })
})

describe('sanitizeSettings', () => {
  it('passes through a fully valid settings object', () => {
    const settings = { ...DEFAULT_SETTINGS, instrument: 'alto_sax' as const, holdMs: 500 }
    expect(sanitizeSettings(settings)).toEqual(settings)
  })

  it('falls back to defaults for non-object input', () => {
    expect(sanitizeSettings(null)).toEqual(DEFAULT_SETTINGS)
    expect(sanitizeSettings('nonsense')).toEqual(DEFAULT_SETTINGS)
    expect(sanitizeSettings(42)).toEqual(DEFAULT_SETTINGS)
  })

  it('falls back field-by-field rather than rejecting the whole object', () => {
    const result = sanitizeSettings({
      instrument: 'not_a_real_instrument',
      holdMs: 900,
      fingeringReveal: 'bogus',
    })
    expect(result.instrument).toBe(DEFAULT_SETTINGS.instrument)
    expect(result.holdMs).toBe(900)
    expect(result.fingeringReveal).toBe(DEFAULT_SETTINGS.fingeringReveal)
  })

  it('clamps an out-of-range tuning offset instead of trusting it', () => {
    expect(sanitizeSettings({ tuningOffsetCents: 500 }).tuningOffsetCents).toBe(
      MAX_CALIBRATION_CENTS,
    )
    expect(sanitizeSettings({ tuningOffsetCents: -500 }).tuningOffsetCents).toBe(
      -MAX_CALIBRATION_CENTS,
    )
  })

  it('accepts fingeringReveal of "off"', () => {
    expect(sanitizeSettings({ fingeringReveal: 'off' }).fingeringReveal).toBe('off')
  })

  it('clamps an out-of-range acceptance threshold into its bounds', () => {
    expect(sanitizeSettings({ acceptanceThresholdCents: 500 }).acceptanceThresholdCents).toBe(50)
    expect(sanitizeSettings({ acceptanceThresholdCents: 1 }).acceptanceThresholdCents).toBe(5)
  })

  it('falls back to the default acceptance threshold for a non-numeric value', () => {
    expect(sanitizeSettings({ acceptanceThresholdCents: 'loose' }).acceptanceThresholdCents).toBe(
      DEFAULT_SETTINGS.acceptanceThresholdCents,
    )
  })
})

describe('loadSettings / saveSettings round trip', () => {
  it('returns defaults when nothing is stored', () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
  })

  it('persists and reloads a changed setting', () => {
    const changed = { ...DEFAULT_SETTINGS, instrument: 'bari_sax' as const, tuningOffsetCents: 4 }
    saveSettings(changed)
    expect(loadSettings()).toEqual(changed)
  })

  it('falls back to defaults for corrupted JSON rather than throwing', () => {
    window.localStorage.setItem('sax-practice-trainer:settings', '{not json')
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
  })
})
