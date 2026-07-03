import { spawn } from 'node:child_process'
import { DEFAULT_MIN_CLARITY, toNote } from '../src/audio/noteMapper.ts'
import { PitchyPitchDetector } from '../src/audio/pitchDetector.ts'
import {
  FRAME_SIZE,
  HOP_SIZE,
  SAMPLE_RATE,
  classify,
  decodeToFloat32,
  findSampleFiles,
  scoreResult,
} from '../tests/sampleClassification.ts'

/**
 * Plays each known note sample (tests/test_data/note_samples) out the
 * speakers via ffplay while running the app's real detector live alongside
 * it, so you can hear the note and watch the classifier track it in real
 * time. The filename-derived note (see sampleClassification.ts) is the known
 * value the live reading is judged against.
 *
 * Run directly:
 *   node --import ./scripts/register-loader.mjs scripts/play-known-samples.ts [filter]
 *
 * An optional [filter] substring restricts playback to matching relative
 * paths (e.g. "tenor sax tomplay/A2").
 */

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

/** ASCII needle: centred at 0 cents, +/-50 cents across the bar. */
function centsBar(cents: number): string {
  const width = 21
  const clamped = Math.max(-50, Math.min(50, cents))
  const pos = Math.round(((clamped + 50) / 100) * (width - 1))
  const chars = Array.from({ length: width }, (_, i) => (i === Math.floor(width / 2) ? '|' : '-'))
  chars[pos] = '●'
  return chars.join('')
}

/** Play an audio file through the speakers; resolves once playback finishes. */
function playFile(filePath: string): Promise<void> {
  return new Promise((resolve) => {
    const proc = spawn('ffplay', ['-hide_banner', '-loglevel', 'quiet', '-autoexit', '-nodisp', filePath])
    proc.on('exit', () => resolve())
  })
}

/** Walk the clip's frames in real time, printing a live-updating reading as it plays. */
async function printLiveReadings(samples: Float32Array): Promise<void> {
  const detector = new PitchyPitchDetector(FRAME_SIZE)
  const hopMs = (HOP_SIZE / SAMPLE_RATE) * 1000

  for (let start = 0; start + FRAME_SIZE <= samples.length; start += HOP_SIZE) {
    const frame = samples.subarray(start, start + FRAME_SIZE) as Float32Array<ArrayBuffer>
    const { hz, clarity } = detector.detect(frame, SAMPLE_RATE)
    const reading = toNote(hz, clarity, { minClarity: DEFAULT_MIN_CLARITY })

    const line = reading
      ? `${reading.noteName.padEnd(4)} ${centsBar(reading.cents)} ${reading.cents >= 0 ? '+' : ''}${reading.cents}c  clarity ${reading.clarity.toFixed(2)}  ${hz.toFixed(1)}Hz`
      : `...listening (clarity ${clarity.toFixed(2)})`
    process.stdout.write(`\r${line}`.padEnd(90))

    await sleep(hopMs)
  }
}

interface ReportRow {
  file: string
  actual: string
  estimation: string
  cents: number
  score: number
}

async function main(): Promise<void> {
  const filter = process.argv[2]
  const samples = findSampleFiles().filter((s) => !filter || s.relativePath.includes(filter))

  if (samples.length === 0) {
    console.log(filter ? `No samples matched "${filter}".` : 'No samples found under tests/test_data/note_samples.')
    return
  }

  const rows: ReportRow[] = []

  for (const sample of samples) {
    console.log(`\n=== ${sample.relativePath}  (known value: ${sample.actualNoteName}) ===`)

    const pcm = decodeToFloat32(sample.filePath)
    await Promise.all([playFile(sample.filePath), printLiveReadings(pcm)])
    const result = classify(pcm)

    const score = scoreResult(result, sample.actualNoteName)
    rows.push({
      file: sample.relativePath,
      actual: sample.actualNoteName,
      estimation: result.estimatedNoteName ?? '(none)',
      cents: Math.round(result.meanCents),
      score,
    })

    console.log(
      `\nestimation: ${result.estimatedNoteName ?? '(none)'}  actual: ${sample.actualNoteName}  score: ${score}/100`,
    )
  }

  console.log('\n=== Summary ===')
  console.table(rows)
  const avgScore = rows.reduce((sum, r) => sum + r.score, 0) / rows.length
  console.log(`Average score: ${avgScore.toFixed(1)}/100`)
}

main()
