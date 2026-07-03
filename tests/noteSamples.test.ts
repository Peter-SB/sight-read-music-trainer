import { describe, expect, it } from 'vitest'
import { classify, decodeToFloat32, findSampleFiles, scoreResult } from './sampleClassification'

/**
 * Decodes every real instrument recording under tests/test_data/note_samples
 * with ffmpeg, runs it through the app's actual pitch detector + classifier,
 * and reports estimation vs. the note encoded in the filename.
 *
 * Purely diagnostic — assertions only check that *something* was detected, so
 * this suite stays green while surfacing classification quality via the
 * console report for tuning. New instrument folders/files are picked up
 * automatically (see {@link findSampleFiles}); no registration step needed.
 */

interface ReportRow {
  file: string
  actual: string
  estimation: string
  cents: number
  score: number
  coverage: string
  agreement: string
  clarity: string
}

describe('note sample classification', () => {
  const samples = findSampleFiles()
  const rows: ReportRow[] = []

  if (samples.length === 0) {
    it.skip('no sample files found under tests/test_data/note_samples', () => {})
  }

  for (const sample of samples) {
    it(`classifies ${sample.relativePath} (filename ${sample.nominalNoteName} -> concert ${sample.actualNoteName})`, () => {
      const pcm = decodeToFloat32(sample.filePath)
      const result = classify(pcm)
      const score = scoreResult(result, sample.actualNoteName)

      rows.push({
        file: sample.relativePath,
        actual: sample.actualNoteName,
        estimation: result.estimatedNoteName ?? '(none)',
        cents: Math.round(result.meanCents),
        score,
        coverage: `${Math.round(result.coverage * 100)}%`,
        agreement: `${Math.round(result.agreementRatio * 100)}%`,
        clarity: result.meanClarity.toFixed(2),
      })

      // Sanity floor only — this suite is a diagnostic report, not a strict
      // pass/fail gate on classification accuracy (see file header).
      expect(result.acceptedFrames.length, 'expected at least one confident frame').toBeGreaterThan(0)
    })
  }

  it('prints a classification report', () => {
    rows.sort((a, b) => a.file.localeCompare(b.file))
    console.table(rows)

    if (rows.length > 0) {
      const avgScore = rows.reduce((sum, r) => sum + r.score, 0) / rows.length
      const misses = rows.filter((r) => r.actual !== r.estimation)
      console.log(`Average score: ${avgScore.toFixed(1)}/100`)
      if (misses.length > 0) {
        console.log(
          `Misclassified: ${misses.map((r) => `${r.file} (expected ${r.actual}, got ${r.estimation})`).join(', ')}`,
        )
      }
    }
  })
})
