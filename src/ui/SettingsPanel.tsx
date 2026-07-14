import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { INSTRUMENTS } from '../config/instruments'
import type { FingeringReveal, SessionSettings } from '../config/settings'
import { allNotesInRange } from '../drill/scaleGenerator'
import { AdaptiveWeightSlider } from './AdaptiveWeightSlider'
import { InstrumentSelector } from './InstrumentSelector'

interface SettingsPanelProps {
  settings: SessionSettings
  onChange: (next: SessionSettings) => void
  onBack: () => void
}

const HOLD_MS_OPTIONS = [0, 200, 300, 400, 600, 800, 1200]
const ACCEPTANCE_CENTS_OPTIONS: { value: number; label: string }[] = [
  { value: 5, label: 'Strict (±5¢)' },
  { value: 10, label: 'Tight (±10¢)' },
  { value: 15, label: 'Firm (±15¢)' },
  { value: 20, label: 'Normal (±20¢)' },
  { value: 30, label: 'Relaxed (±30¢)' },
  { value: 50, label: 'Lenient (±50¢)' },
]
const FINGERING_REVEAL_OPTIONS: { value: FingeringReveal; label: string }[] = [
  { value: 0, label: 'Always on (0s)' },
  { value: 1, label: '1s delay' },
  { value: 2, label: '2s delay' },
  { value: 3, label: '3s delay' },
  { value: 'off', label: 'Never shown' },
]

export function SettingsPanel({ settings, onChange, onBack }: SettingsPanelProps) {
  const navigate = useNavigate()
  const { writtenRange } = INSTRUMENTS[settings.instrument]

  const rangeOptions = useMemo(
    () => allNotesInRange(writtenRange),
    [writtenRange],
  )

  return (
    <div className="page">
      <header className="page__header">
        <button type="button" className="link-button" onClick={onBack}>
          ← Home
        </button>
        <h2>Settings</h2>
      </header>

      <div className="settings">
        <InstrumentSelector
          value={settings.instrument}
          onChange={(instrument) =>
            onChange({
              ...settings,
              instrument,
              rangeLow: INSTRUMENTS[instrument].writtenRange.low,
              rangeHigh: INSTRUMENTS[instrument].writtenRange.high,
            })
          }
        />

        <label className="field">
          <span>Note range low</span>
          <select
            value={settings.rangeLow}
            onChange={(e) => onChange({ ...settings, rangeLow: e.target.value })}
          >
            {rangeOptions.map((note) => (
              <option key={note} value={note}>
                {note}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Note range high</span>
          <select
            value={settings.rangeHigh}
            onChange={(e) => onChange({ ...settings, rangeHigh: e.target.value })}
          >
            {rangeOptions.map((note) => (
              <option key={note} value={note}>
                {note}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Hold time to confirm</span>
          <select
            value={settings.holdMs}
            onChange={(e) =>
              onChange({ ...settings, holdMs: Number(e.target.value) })
            }
          >
            {HOLD_MS_OPTIONS.map((ms) => (
              <option key={ms} value={ms}>
                {ms === 0 ? 'Instant (0ms)' : `${ms}ms`}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Note acceptance threshold</span>
          <select
            value={settings.acceptanceThresholdCents}
            onChange={(e) =>
              onChange({ ...settings, acceptanceThresholdCents: Number(e.target.value) })
            }
          >
            {ACCEPTANCE_CENTS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Fingering chart reveal</span>
          <select
            value={String(settings.fingeringReveal)}
            onChange={(e) => {
              const raw = e.target.value
              onChange({
                ...settings,
                fingeringReveal: raw === 'off' ? 'off' : (Number(raw) as FingeringReveal),
              })
            }}
          >
            {FINGERING_REVEAL_OPTIONS.map((opt) => (
              <option key={String(opt.value)} value={String(opt.value)}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <AdaptiveWeightSlider
          value={settings.adaptiveWeight}
          onChange={(adaptiveWeight) => onChange({ ...settings, adaptiveWeight })}
        />

        <button
          type="button"
          className="mic-button"
          onClick={() => navigate('/calibrate')}
        >
          Calibrate mic
        </button>
      </div>
    </div>
  )
}
