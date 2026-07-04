/**
 * Per-note timing scores: a rolling history of how long (ms) it took the
 * player to first get each note in tune, keyed by concert note name (e.g.
 * "C4") and shared globally across every instrument/scale/range — the same
 * localStorage-backed, sanitize-on-load pattern as {@link ../config/settingsStorage},
 * but its own store since it's written far more frequently and isn't part of
 * {@link SessionSettings}.
 */

const STORAGE_KEY = 'sax-practice-trainer:note-scores'
const MAX_HISTORY = 10

let scores: Record<string, number[]> = load()

function load(): Record<string, number[]> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return sanitize(JSON.parse(raw))
  } catch {
    return {}
  }
}

function sanitize(parsed: unknown): Record<string, number[]> {
  if (typeof parsed !== 'object' || parsed === null) return {}
  const out: Record<string, number[]> = {}
  for (const [note, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (!Array.isArray(value)) continue
    const delays = value.filter(
      (v): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0,
    )
    if (delays.length > 0) out[note] = delays.slice(-MAX_HISTORY)
  }
  return out
}

function persist(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(scores))
  } catch {
    // Storage unavailable — scores still work in-memory for this visit.
  }
}

/** Record a fresh reaction-time sample for `note`, capping its history to the most recent {@link MAX_HISTORY}. */
export function recordNoteDelay(note: string, delayMs: number): void {
  const history = scores[note] ?? []
  scores = { ...scores, [note]: [...history, delayMs].slice(-MAX_HISTORY) }
  persist()
}

/** Rolling average reaction time (ms) for `note`, or null if it's never been recorded. */
export function getAverageDelay(note: string): number | null {
  const history = scores[note]
  if (!history || history.length === 0) return null
  return history.reduce((sum, v) => sum + v, 0) / history.length
}

/** Snapshot of every note's recorded delay history. */
export function getAllNoteScores(): Readonly<Record<string, number[]>> {
  return scores
}
