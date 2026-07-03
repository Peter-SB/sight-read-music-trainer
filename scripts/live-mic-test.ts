import { spawn } from 'node:child_process'
import { A4_HZ, DEFAULT_MIN_CLARITY, calibratedA4Hz, toNote } from '../src/audio/noteMapper.ts'
import { PitchyPitchDetector } from '../src/audio/pitchDetector.ts'
import { forDisplay } from '../src/audio/transposition.ts'
import { INSTRUMENTS, type InstrumentId } from '../src/config/instruments.ts'

/**
 * Manual, interactive tuner: captures the live mic through ffmpeg, mirrors it
 * to the speakers through ffplay (so you can hear yourself while playing),
 * and runs every frame through the app's real detector + classifier, printing
 * a live-updating reading.
 *
 * Not a vitest test — there's no ground truth to assert against, just a human
 * playing an instrument. Run directly:
 *
 *   node scripts/live-mic-test.ts [--device "Mic Name"] [--instrument tenor_sax] [--a4-offset 0] [--no-monitor]
 *
 * Run with --list-devices to print available ffmpeg dshow audio devices.
 */

const SAMPLE_RATE = 44100
const FRAME_SIZE = 2048
const HOP_SIZE = 512
const DEFAULT_DEVICE = 'Microphone (HD Pro Webcam C920)'

interface Args {
  device: string
  instrument: InstrumentId | null
  a4OffsetCents: number
  monitor: boolean
  listDevices: boolean
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    device: DEFAULT_DEVICE,
    instrument: null,
    a4OffsetCents: 0,
    monitor: true,
    listDevices: false,
  }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--list-devices') args.listDevices = true
    else if (arg === '--device') args.device = argv[++i]
    else if (arg === '--instrument') args.instrument = argv[++i] as InstrumentId
    else if (arg === '--a4-offset') args.a4OffsetCents = Number(argv[++i])
    else if (arg === '--no-monitor') args.monitor = false
  }

  return args
}

function listDshowDevices(): Promise<void> {
  return new Promise((resolve) => {
    const proc = spawn('ffmpeg', ['-hide_banner', '-list_devices', 'true', '-f', 'dshow', '-i', 'dummy'])
    proc.stderr.on('data', (chunk: Buffer) => process.stdout.write(chunk))
    proc.on('close', () => resolve())
  })
}

/** Copy a raw stdout chunk into a Float32Array without assuming 4-byte alignment. */
function bufferToFloat32(chunk: Buffer): Float32Array {
  const out = new Float32Array(chunk.length / 4)
  for (let i = 0; i < out.length; i++) out[i] = chunk.readFloatLE(i * 4)
  return out
}

function concatFloat32(a: Float32Array, b: Float32Array): Float32Array {
  const out = new Float32Array(a.length + b.length)
  out.set(a, 0)
  out.set(b, a.length)
  return out
}

/** ASCII needle: centred at 0 cents, +/-50 cents across the bar. */
function centsBar(cents: number): string {
  const width = 21
  const clamped = Math.max(-50, Math.min(50, cents))
  const pos = Math.round(((clamped + 50) / 100) * (width - 1))
  const chars = Array.from({ length: width }, (_, i) => (i === Math.floor(width / 2) ? '|' : '-'))
  chars[pos] = '●'
  return chars.join('')
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))

  if (args.listDevices) {
    console.log('Available ffmpeg dshow audio devices:\n')
    await listDshowDevices()
    return
  }

  const a4Hz = calibratedA4Hz(args.a4OffsetCents, A4_HZ)
  const detector = new PitchyPitchDetector(FRAME_SIZE)

  console.log(`Capturing from: ${args.device}`)
  if (args.instrument) console.log(`Displaying written pitch for: ${INSTRUMENTS[args.instrument].label}`)
  console.log(args.monitor ? 'Speaker monitoring: ON (you will hear yourself)' : 'Speaker monitoring: OFF')
  console.log('Play a sustained note. Ctrl+C to stop.\n')

  const capture = spawn('ffmpeg', [
    '-hide_banner',
    '-loglevel',
    'error',
    '-f',
    'dshow',
    '-i',
    `audio=${args.device}`,
    '-f',
    'f32le',
    '-ac',
    '1',
    '-ar',
    String(SAMPLE_RATE),
    'pipe:1',
  ])

  const player = args.monitor
    ? spawn('ffplay', [
        '-hide_banner',
        '-loglevel',
        'quiet',
        '-nodisp',
        '-f',
        'f32le',
        '-ar',
        String(SAMPLE_RATE),
        '-ac',
        '1',
        '-i',
        'pipe:0',
      ])
    : null

  let pending = new Float32Array(0)

  capture.stdout.on('data', (chunk: Buffer) => {
    player?.stdin.write(chunk)

    pending = concatFloat32(pending, bufferToFloat32(chunk))
    let offset = 0
    while (offset + FRAME_SIZE <= pending.length) {
      const frame = pending.subarray(offset, offset + FRAME_SIZE) as Float32Array<ArrayBuffer>
      const { hz, clarity } = detector.detect(frame, SAMPLE_RATE)
      const reading = toNote(hz, clarity, { a4Hz, minClarity: DEFAULT_MIN_CLARITY })

      if (reading) {
        const shown = args.instrument ? forDisplay(reading, args.instrument) : reading
        const line = `${shown.noteName.padEnd(4)} ${centsBar(reading.cents)} ${reading.cents >= 0 ? '+' : ''}${reading.cents}c  clarity ${reading.clarity.toFixed(2)}  ${hz.toFixed(1)}Hz`
        process.stdout.write(`\r${line}`.padEnd(90))
      } else {
        process.stdout.write(`\r...listening (clarity ${clarity.toFixed(2)})`.padEnd(90))
      }

      offset += HOP_SIZE
    }
    pending = pending.subarray(offset)
  })

  capture.stderr.on('data', (chunk: Buffer) => {
    process.stderr.write(`\n[ffmpeg] ${chunk}`)
  })

  capture.on('exit', (code) => {
    console.log(`\nCapture process exited (code ${code}). Run with --list-devices to check the device name.`)
    player?.kill()
    process.exit(code ?? 0)
  })

  const shutdown = (): void => {
    console.log('\nStopping...')
    capture.kill()
    player?.kill()
    process.exit(0)
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

main()
