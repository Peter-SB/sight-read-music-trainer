import { execFileSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { DEFAULT_MIN_CLARITY, midiToNoteName, noteNameToMidi, toNote } from '../src/audio/noteMapper'
import { PitchyPitchDetector } from '../src/audio/pitchDetector'
import { INSTRUMENTS, type InstrumentId } from '../src/config/instruments'

/**
 * Shared logic for classifying the real instrument recordings under
 * tests/test_data/note_samples: locating files, recovering ground truth from
 * their filenames, decoding with ffmpeg, and running the app's actual pitch
 * detector + classifier over them.
 *
 * Used by both the automated report (noteSamples.test.ts) and the interactive
 * playback demo (scripts/play-known-samples.ts).
 */

export const SAMPLE_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  'test_data/note_samples',
)

export const SAMPLE_RATE = 44100
export const FRAME_SIZE = 2048
export const HOP_SIZE = 512

export interface SampleFile {
  /** Absolute path to the audio file. */
  filePath: string
  /** Path relative to SAMPLE_ROOT, used as the test label. */
  relativePath: string
  /** Note name parsed straight from the filename, before convention resolution. */
  nominalNoteName: string
  /** Ground-truth concert-pitch note name, after applying the folder's convention. */
  actualNoteName: string
}

export interface FrameReading {
  hz: number
  clarity: number
  noteName: string | null
  cents: number
}

export interface ClassificationResult {
  totalFrames: number
  acceptedFrames: FrameReading[]
  /** Most common note name among accepted frames, or null if none accepted. */
  estimatedNoteName: string | null
  /** Mean cents deviation among frames agreeing with the estimated note. */
  meanCents: number
  /** Mean clarity among accepted frames. */
  meanClarity: number
  /** accepted / total — how much of the clip yielded a confident reading. */
  coverage: number
  /** frames agreeing with the mode / accepted — consistency of the reading. */
  agreementRatio: number
}

/**
 * Ground-truth convention for a sample folder: what pitch space + octave
 * numbering the filenames use, so they can be converted to the concert-pitch
 * name {@link toNote} actually returns.
 *
 * The "tenor sax tomplay" set encodes the *written* (as-fingered) note, but
 * with an octave digit 2 lower than scientific pitch notation (its "Bb1" is
 * scientific Bb3 — confirmed by median detected Hz landing within a few cents
 * of every file's predicted concert pitch once that offset + the tenor's
 * transposition are applied). Folders not listed here are assumed to already
 * name concert pitch in standard scientific notation (offset 0).
 */
const FOLDER_CONVENTIONS: Record<
  string,
  { instrument: InstrumentId; pitchSpace: 'written' | 'concert'; octaveOffset: number }
> = {
  'tenor sax tomplay': { instrument: 'tenor_sax', pitchSpace: 'written', octaveOffset: 2 },
}

/** Resolve a filename's nominal note name to the concert-pitch name toNote() would report. */
function resolveGroundTruth(nominalNoteName: string, folderKey: string): string {
  const convention = FOLDER_CONVENTIONS[folderKey]
  if (!convention) return nominalNoteName

  const nominalMidi = noteNameToMidi(nominalNoteName)!
  const scientificMidi = nominalMidi + convention.octaveOffset * 12
  if (convention.pitchSpace === 'concert') return midiToNoteName(scientificMidi)

  const concertMidi = scientificMidi - INSTRUMENTS[convention.instrument].transposeSemitones
  return midiToNoteName(concertMidi)
}

/**
 * Pull a leading note name (e.g. "Bb2" out of "Bb2.mp3", or "F3#" out of
 * "F3di.mp3") off a filename. A trailing "di" ("diesis", Italian for sharp —
 * this sample set's convention for marking a sharp instead of "#" in the
 * filename) is folded into the accidental; confirmed by "F3di"/"F2di" only
 * matching the detector's output once read as F#3/F#2. Any other trailing
 * junk (takes, variants, etc.) is ignored. Returns null if the filename
 * doesn't start with a parseable note name.
 */
function parseNoteNameFromFilename(filename: string): string | null {
  const stem = filename.replace(/\.[^.]+$/, '')
  const match = /^([A-Ga-g])(b?)(-?\d+)(di)?/i.exec(stem)
  if (!match) return null

  const [, letter, flat, octave, diesis] = match
  const accidental = diesis ? '#' : flat
  const noteName = `${letter.toUpperCase()}${accidental}${octave}`
  return noteNameToMidi(noteName) === null ? null : noteName
}

/** Find every audio file under SAMPLE_ROOT, however deep, grouped by nothing in particular. */
export function findSampleFiles(): SampleFile[] {
  const entries = readdirSync(SAMPLE_ROOT, { recursive: true, withFileTypes: true })
  const files: SampleFile[] = []

  for (const entry of entries) {
    if (!entry.isFile()) continue
    if (!/\.(mp3|wav|m4a|flac)$/i.test(entry.name)) continue

    const entryDir = 'parentPath' in entry ? (entry.parentPath as string) : (entry.path as string)
    const filePath = path.join(entryDir, entry.name)
    const relativePath = path.relative(SAMPLE_ROOT, filePath)
    const nominalNoteName = parseNoteNameFromFilename(entry.name)
    if (!nominalNoteName) continue

    const folderKey = path.dirname(relativePath)
    const actualNoteName = resolveGroundTruth(nominalNoteName, folderKey)

    files.push({ filePath, relativePath, nominalNoteName, actualNoteName })
  }

  return files.sort((a, b) => a.relativePath.localeCompare(b.relativePath))
}

/** Decode an audio file to mono 44.1kHz Float32 PCM via ffmpeg. */
export function decodeToFloat32(filePath: string): Float32Array {
  const buffer = execFileSync(
    'ffmpeg',
    ['-v', 'error', '-i', filePath, '-f', 'f32le', '-ac', '1', '-ar', String(SAMPLE_RATE), 'pipe:1'],
    { maxBuffer: 1024 * 1024 * 100 },
  )
  return new Float32Array(buffer.buffer, buffer.byteOffset, buffer.length / 4)
}

/** Run the app's real detector + classifier over sliding windows of the clip. */
export function classify(samples: Float32Array): ClassificationResult {
  const detector = new PitchyPitchDetector(FRAME_SIZE)
  const frames: FrameReading[] = []

  for (let start = 0; start + FRAME_SIZE <= samples.length; start += HOP_SIZE) {
    const window = samples.subarray(start, start + FRAME_SIZE) as Float32Array<ArrayBuffer>
    const { hz, clarity } = detector.detect(window, SAMPLE_RATE)
    const note = toNote(hz, clarity, { minClarity: DEFAULT_MIN_CLARITY })
    frames.push({ hz, clarity, noteName: note?.noteName ?? null, cents: note?.cents ?? 0 })
  }

  const accepted = frames.filter((f) => f.noteName !== null)
  const counts = new Map<string, number>()
  for (const f of accepted) counts.set(f.noteName!, (counts.get(f.noteName!) ?? 0) + 1)

  let estimatedNoteName: string | null = null
  let bestCount = 0
  for (const [name, count] of counts) {
    if (count > bestCount) {
      bestCount = count
      estimatedNoteName = name
    }
  }

  const agreeing = accepted.filter((f) => f.noteName === estimatedNoteName)
  const meanCents = agreeing.length
    ? agreeing.reduce((sum, f) => sum + f.cents, 0) / agreeing.length
    : 0
  const meanClarity = accepted.length
    ? accepted.reduce((sum, f) => sum + f.clarity, 0) / accepted.length
    : 0

  return {
    totalFrames: frames.length,
    acceptedFrames: accepted,
    estimatedNoteName,
    meanCents,
    meanClarity,
    coverage: frames.length ? accepted.length / frames.length : 0,
    agreementRatio: accepted.length ? agreeing.length / accepted.length : 0,
  }
}

/** 0-100: rewards a correct note name, tight tuning, high coverage and consistency. */
export function scoreResult(result: ClassificationResult, actualNoteName: string): number {
  if (!result.estimatedNoteName) return 0
  if (result.estimatedNoteName !== actualNoteName) return 0

  const centsPenalty = Math.min(1, Math.abs(result.meanCents) / 50)
  const raw = (1 - centsPenalty * 0.6) * result.agreementRatio * result.coverage
  return Math.round(raw * 100)
}
