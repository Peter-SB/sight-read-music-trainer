import { describe, expect, it } from 'vitest'
import { MAX_CALIBRATION_CENTS } from './noteMapper'
import {
  computeCalibration,
  median,
  MIN_CALIBRATION_SAMPLES,
  type CalibrationResult,
} from './calibration'

/** A batch of `count` identical samples, enough to clear the minimum. */
function samples(cents: number, count = MIN_CALIBRATION_SAMPLES): number[] {
  return Array.from({ length: count }, () => cents)
}

describe('median', () => {
  it('returns 0 for an empty list', () => {
    expect(median([])).toBe(0)
  })

  it('returns the middle value for an odd-length list', () => {
    expect(median([3, 1, 2])).toBe(2)
  })

  it('averages the two middle values for an even-length list', () => {
    expect(median([1, 2, 3, 4])).toBe(2.5)
  })

  it('is unmoved by extreme outliers', () => {
    expect(median([4, 5, 6, 5, 999])).toBe(5)
  })
})

describe('computeCalibration', () => {
  it('returns null when there are too few samples to trust', () => {
    expect(computeCalibration(samples(5, MIN_CALIBRATION_SAMPLES - 1))).toBeNull()
  })

  it('cancels a consistent sharp bias with a negative offset', () => {
    const result = computeCalibration(samples(5)) as CalibrationResult
    expect(result.measuredCents).toBe(5)
    expect(result.offsetCents).toBe(-5)
    expect(result.clamped).toBe(false)
  })

  it('cancels a consistent flat bias with a positive offset', () => {
    const result = computeCalibration(samples(-4)) as CalibrationResult
    expect(result.measuredCents).toBe(-4)
    expect(result.offsetCents).toBe(4)
  })

  it('reports a near-zero offset for an in-tune setup', () => {
    const result = computeCalibration(samples(0)) as CalibrationResult
    expect(result.offsetCents).toBe(0)
  })

  it('clamps a bias larger than the calibration range and flags it', () => {
    const result = computeCalibration(samples(MAX_CALIBRATION_CENTS + 20)) as CalibrationResult
    expect(result.offsetCents).toBe(-MAX_CALIBRATION_CENTS)
    expect(result.clamped).toBe(true)
  })

  it('takes the median so a few off notes do not skew the result', () => {
    // Mostly +6, with a couple of wild transition frames that the median ignores.
    const noisy = [...samples(6), -40, 45]
    const result = computeCalibration(noisy) as CalibrationResult
    expect(result.measuredCents).toBe(6)
    expect(result.offsetCents).toBe(-6)
  })

  it('carries through how many samples were used', () => {
    const result = computeCalibration(samples(2, 20)) as CalibrationResult
    expect(result.sampleCount).toBe(20)
  })
})
