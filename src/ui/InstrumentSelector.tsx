import { INSTRUMENT_LIST, type InstrumentId } from '../config/instruments'

/**
 * Instrument picker. The POC ships tenor sax, but every sax is wired up so this
 * is a real selector rather than a stub — transposition already handles them all.
 */

interface InstrumentSelectorProps {
  value: InstrumentId
  onChange: (id: InstrumentId) => void
  disabled?: boolean
}

export function InstrumentSelector({
  value,
  onChange,
  disabled,
}: InstrumentSelectorProps) {
  return (
    <label className="instrument-selector">
      <span className="instrument-selector__label">Instrument</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as InstrumentId)}
      >
        {INSTRUMENT_LIST.map((inst) => (
          <option key={inst.id} value={inst.id}>
            {inst.label}
          </option>
        ))}
      </select>
    </label>
  )
}
