/**
 * Scale definitions used by drill mode.
 *
 * Intervals are semitone offsets from the root, ascending, within one octave.
 * Kept intentionally small for MVP — major/minor cover the primary practice
 * loop described in the design doc; chromatic is useful as a full-range warm-up.
 */

export type ScaleId = 'major' | 'natural_minor' | 'chromatic'

export interface ScaleDefinition {
  id: ScaleId
  label: string
  /** Semitone offsets from the root, ascending, within one octave (no octave repeat). */
  intervals: number[]
}

export const SCALES: Record<ScaleId, ScaleDefinition> = {
  major: {
    id: 'major',
    label: 'Major',
    intervals: [0, 2, 4, 5, 7, 9, 11],
  },
  natural_minor: {
    id: 'natural_minor',
    label: 'Natural Minor',
    intervals: [0, 2, 3, 5, 7, 8, 10],
  },
  chromatic: {
    id: 'chromatic',
    label: 'Chromatic',
    intervals: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  },
}

export const SCALE_LIST: ScaleDefinition[] = Object.values(SCALES)

/** All twelve pitch classes a scale can be rooted on, spelled with flats. */
export const SCALE_ROOTS = [
  'C',
  'Db',
  'D',
  'Eb',
  'E',
  'F',
  'Gb',
  'G',
  'Ab',
  'A',
  'Bb',
  'B',
] as const

export type ScaleRoot = (typeof SCALE_ROOTS)[number]
