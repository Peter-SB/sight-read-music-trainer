import type { NoteSource } from './drillStateMachine'
import { getAverageDelay } from './noteScores'

/**
 * Endless up-then-down walk through `pool`, cycling forever via closure state
 * instead of a fixed pre-computed array. Produces
 * pool[0..n-1], pool[n-2..0], pool[1..n-1], ... forever.
 */
export function createSequentialNoteSource(pool: string[]): NoteSource {
  let ascending = true
  let idx = -1

  return () => {
    if (pool.length === 0) return null
    if (idx === -1) {
      idx = 0
      return pool[0]
    }
    if (ascending) {
      if (idx + 1 < pool.length) {
        idx++
        return pool[idx]
      }
      if (pool.length > 1) {
        ascending = false
        idx--
        return pool[idx]
      }
      return pool[0]
    }
    if (idx - 1 >= 0) {
      idx--
      return pool[idx]
    }
    ascending = true
    idx = pool.length > 1 ? 1 : 0
    return pool[idx]
  }
}

/**
 * Endless weighted-random draw from `pool`, reweighted live on every call from
 * {@link getAverageDelay} so it reflects newly recorded timing data
 * immediately rather than only at drill start. `weightSetting` (0-5) controls
 * bias strength: at 0 every note's weight collapses to 1 (uniform).
 */
export function createAdaptiveNoteSource(pool: string[], weightSetting: number): NoteSource {
  return (previousNote) => {
    if (pool.length === 0) return null
    const candidates =
      pool.length > 1 && previousNote !== null ? pool.filter((n) => n !== previousNote) : pool

    const rawAverages = candidates.map((n) => getAverageDelay(n))
    const known = rawAverages.filter((v): v is number => v !== null)
    const poolMean = known.length > 0 ? known.reduce((s, v) => s + v, 0) / known.length : 1

    const weights = candidates.map((_note, i) => {
      const avg = rawAverages[i] ?? poolMean
      const clamped = Math.max(poolMean * 0.2, Math.min(poolMean * 5, avg))
      const relativeSlowness = poolMean > 0 ? clamped / poolMean : 1
      return relativeSlowness ** weightSetting
    })

    const total = weights.reduce((s, w) => s + w, 0)
    if (total <= 0) return candidates[Math.floor(Math.random() * candidates.length)]

    let r = Math.random() * total
    for (let i = 0; i < candidates.length; i++) {
      r -= weights[i]
      if (r <= 0) return candidates[i]
    }
    return candidates[candidates.length - 1]
  }
}
