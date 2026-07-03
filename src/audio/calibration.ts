import { MAX_CALIBRATION_CENTS } from './noteMapper'

/**
 * Pure maths behind the mic-calibration screen. Given the cents deviations
 * measured while the player holds in-tune notes (analysed against the *base*
 * A4 = 440, i.e. with no existing offset applied), work out the calibration
 * offset that cancels the setup's consistent bias.
 *
 * Kept framework- and browser-free so it's unit-testable without a mic — the
 * same split the rest of the audio pipeline uses.
 */

/** How long (ms) to count in before the first note. */
export const CALIBRATION_COUNTDOWN_MS = 3000

/** How long (ms) the correct note must be held (accumulated) to finish each note. */
export const CALIBRATION_HOLD_MS_PER_NOTE = 2500

/**
 * The notes the player is walked through, as *written* names for the selected
 * instrument (what they read and finger). Spread across the range so the
 * measured bias isn't tied to one register.
 */
export const CALIBRATION_TARGET_NOTES = ['D4', 'B4', 'F5', 'D5'] as const

/**
 * Below this many confident samples we don't trust the result — the player
 * likely wasn't sounding a steady note for enough of the window.
 */
export const MIN_CALIBRATION_SAMPLES = 15

/**
 * How close to the target pitch (cents) a reading must be to count toward
 * hold progress. Adjustable via the "Accuracy" slider on the calibration
 * screen — wider tolerance is more forgiving of rough intonation, at the cost
 * of noisier (but still median-filtered) samples feeding the result.
 */
export const MIN_CALIBRATION_TOLERANCE_CENTS = 10
export const MAX_CALIBRATION_TOLERANCE_CENTS = 50
export const DEFAULT_CALIBRATION_TOLERANCE_CENTS = 25

export interface CalibrationResult {
  /** Median cents the setup read across the sample. Positive = read sharp. */
  measuredCents: number
  /**
   * Offset to store in {@link SessionSettings.tuningOffsetCents} to cancel the
   * measured bias, clamped to ±{@link MAX_CALIBRATION_CENTS}.
   */
  offsetCents: number
  /**
   * True when the raw correction exceeded what calibration can represent and
   * had to be clamped — a hint that something other than mic bias is off
   * (wrong reference pitch, badly out-of-tune instrument).
   */
  clamped: boolean
  /** How many confident samples fed the result. */
  sampleCount: number
}

/**
 * Median of a list of numbers. Chosen over the mean because it shrugs off the
 * cents spikes that happen as the player slides between notes or the detector
 * briefly locks onto a harmonic, without needing an explicit outlier filter.
 */
export function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

/**
 * Turn a batch of measured cents deviations into a calibration result, or
 * `null` if too few samples were gathered to trust it.
 *
 * The player is assumed to be playing as in-tune as they can, so the median
 * deviation is treated as the setup's systematic bias: an offset of `-median`
 * cancels it (positive {@link SessionSettings.tuningOffsetCents} shifts
 * readings sharper — see {@link calibratedA4Hz}).
 */
export function computeCalibration(centsSamples: number[]): CalibrationResult | null {
  if (centsSamples.length < MIN_CALIBRATION_SAMPLES) return null

  const measuredCents = Math.round(median(centsSamples))
  // `|| 0` normalises the -0 that negating a zero median would otherwise produce.
  const rawOffset = -measuredCents || 0
  const offsetCents = Math.max(-MAX_CALIBRATION_CENTS, Math.min(MAX_CALIBRATION_CENTS, rawOffset))

  return {
    measuredCents,
    offsetCents,
    clamped: offsetCents !== rawOffset,
    sampleCount: centsSamples.length,
  }
}
