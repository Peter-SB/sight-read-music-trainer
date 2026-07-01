import type { PitchReading } from './types'
import {
  PitchyPitchDetector,
  type PitchDetectorAdapter,
} from './pitchDetector'

/**
 * Mic capture + per-frame pitch analysis.
 *
 * Uses an AnalyserNode pulled on a requestAnimationFrame loop — simple,
 * non-deprecated, and adequate for monophonic pitch tracking. (The README's
 * AudioWorklet path is a future swap behind this same class boundary if we need
 * frames fully off the main thread; nothing outside this file assumes either.)
 */

export type CaptureStatus = 'idle' | 'requesting' | 'running' | 'error'

export interface AudioCaptureOptions {
  /** Analysis window in samples (power of two). Defaults to 2048. */
  fftSize?: number
  /** Swap in a different detection algorithm. Defaults to Pitchy (McLeod). */
  detector?: PitchDetectorAdapter
}

export interface AudioCaptureCallbacks {
  /** Called once per analysed frame while running. */
  onReading: (reading: PitchReading) => void
  /** Called on every status transition; `error` set only on 'error'. */
  onStatusChange?: (status: CaptureStatus, error?: Error) => void
}

export class AudioCapture {
  private readonly fftSize: number
  private readonly detector: PitchDetectorAdapter
  private readonly callbacks: AudioCaptureCallbacks

  private context: AudioContext | null = null
  private stream: MediaStream | null = null
  private source: MediaStreamAudioSourceNode | null = null
  private analyser: AnalyserNode | null = null
  private frame: Float32Array<ArrayBuffer> | null = null
  private rafId: number | null = null

  private _status: CaptureStatus = 'idle'

  constructor(callbacks: AudioCaptureCallbacks, options: AudioCaptureOptions = {}) {
    this.callbacks = callbacks
    this.fftSize = options.fftSize ?? 2048
    this.detector = options.detector ?? new PitchyPitchDetector(this.fftSize)
  }

  get status(): CaptureStatus {
    return this._status
  }

  private setStatus(status: CaptureStatus, error?: Error): void {
    this._status = status
    this.callbacks.onStatusChange?.(status, error)
  }

  /**
   * Request mic permission and begin the analysis loop. Must be called from a
   * user gesture (browsers gate AudioContext + getUserMedia on interaction).
   */
  async start(): Promise<void> {
    if (this._status === 'running' || this._status === 'requesting') return
    this.setStatus('requesting')

    try {
      // Disable the browser's voice-oriented DSP: it distorts pitch/harmonics
      // and can mangle a sustained instrument tone.
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      })

      this.context = new AudioContext()
      // Autoplay policy can leave the context suspended until resumed.
      if (this.context.state === 'suspended') await this.context.resume()

      this.source = this.context.createMediaStreamSource(this.stream)
      this.analyser = this.context.createAnalyser()
      this.analyser.fftSize = this.fftSize
      this.source.connect(this.analyser)

      this.frame = new Float32Array(this.analyser.fftSize)
      this.setStatus('running')
      this.tick()
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      this.stop()
      this.setStatus('error', error)
      throw error
    }
  }

  private tick = (): void => {
    if (!this.analyser || !this.context || !this.frame) return

    this.analyser.getFloatTimeDomainData(this.frame)
    const { hz, clarity } = this.detector.detect(
      this.frame,
      this.context.sampleRate,
    )
    this.callbacks.onReading({ hz, clarity, timestamp: performance.now() })

    this.rafId = requestAnimationFrame(this.tick)
  }

  /** Stop analysis and release the mic. Safe to call repeatedly. */
  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    this.source?.disconnect()
    this.stream?.getTracks().forEach((track) => track.stop())
    void this.context?.close()

    this.source = null
    this.analyser = null
    this.stream = null
    this.context = null
    this.frame = null

    if (this._status !== 'error') this.setStatus('idle')
  }
}
