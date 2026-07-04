import { MAX_ADAPTIVE_WEIGHT, MIN_ADAPTIVE_WEIGHT } from '../config/settings'

/**
 * Controls how strongly the drill biases note selection toward slow-scoring
 * notes. 0 = off (deterministic sequential drill); 1-5 = increasing bias.
 * Reuses the `.tuning-slider` styling since the structure is identical.
 */

interface AdaptiveWeightSliderProps {
  value: number
  onChange: (value: number) => void
}

export function AdaptiveWeightSlider({ value, onChange }: AdaptiveWeightSliderProps) {
  return (
    <div className="tuning-slider">
      <label className="tuning-slider__label" htmlFor="adaptive-weight-slider-input">
        Adaptive difficulty (0 = off)
      </label>
      <input
        id="adaptive-weight-slider-input"
        type="range"
        min={MIN_ADAPTIVE_WEIGHT}
        max={MAX_ADAPTIVE_WEIGHT}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="tuning-slider__input"
      />
      <span className="tuning-slider__value">{value === 0 ? 'Off' : value}</span>
    </div>
  )
}
