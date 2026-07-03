import { MAX_CALIBRATION_CENTS } from '../audio/noteMapper'

/**
 * Small calibration control for mics/interfaces that read consistently a
 * touch sharp or flat. Feeds {@link calibratedA4Hz} via the owning screen —
 * this component is purely the slider UI.
 */

interface TuningSliderProps {
  valueCents: number
  onChange: (valueCents: number) => void
}

export function TuningSlider({ valueCents, onChange }: TuningSliderProps) {
  return (
    <div className="tuning-slider">
      <label className="tuning-slider__label" htmlFor="tuning-slider-input">
        Mic calibration
      </label>
      <input
        id="tuning-slider-input"
        type="range"
        min={-MAX_CALIBRATION_CENTS}
        max={MAX_CALIBRATION_CENTS}
        step={1}
        value={valueCents}
        onChange={(e) => onChange(Number(e.target.value))}
        className="tuning-slider__input"
      />
      <span className="tuning-slider__value">
        {valueCents === 0 ? '0¢' : `${valueCents > 0 ? '+' : ''}${valueCents}¢`}
      </span>
    </div>
  )
}
