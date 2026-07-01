import { PitchDetector as PitchyDetector } from 'pitchy'

/**
 * Pitch-detection adapter boundary.
 *
 * The rest of the app depends only on {@link PitchDetectorAdapter}, so an
 * alternative algorithm (e.g. YIN via Pitchfinder) can be dropped in for
 * comparison/testing without touching the capture loop or UI.
 */
export interface PitchDetectorAdapter {
  /** Frame size (samples) this detector expects. Must match the analyser. */
  readonly inputLength: number
  /**
   * Analyse one time-domain frame.
   * @returns fundamental in Hz and a 0–1 clarity/confidence.
   */
  detect(
    frame: Float32Array<ArrayBuffer>,
    sampleRate: number,
  ): { hz: number; clarity: number }
}

/**
 * McLeod Pitch Method via Pitchy — the primary detector. More robust than plain
 * autocorrelation/YIN in the low register (sax low Bb ≈ 117 Hz concert), where
 * octave errors are common.
 */
export class PitchyPitchDetector implements PitchDetectorAdapter {
  readonly inputLength: number
  private readonly detector: ReturnType<
    typeof PitchyDetector.forFloat32Array
  >

  /**
   * @param inputLength analysis window in samples (power of two, matching the
   *   AnalyserNode fftSize). 2048 balances low-note resolution vs latency.
   * @param minVolumeDecibels frames quieter than this yield clarity 0.
   */
  constructor(inputLength = 2048, minVolumeDecibels = -40) {
    this.inputLength = inputLength
    this.detector = PitchyDetector.forFloat32Array(inputLength)
    this.detector.minVolumeDecibels = minVolumeDecibels
  }

  detect(
    frame: Float32Array<ArrayBuffer>,
    sampleRate: number,
  ): { hz: number; clarity: number } {
    const [hz, clarity] = this.detector.findPitch(frame, sampleRate)
    return { hz, clarity }
  }
}
