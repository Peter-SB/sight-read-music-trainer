/**
 * Instrument definitions: transposition intervals and playable ranges.
 *
 * Transposition is a *display-layer* concern only — pitch detection always
 * works in concert pitch (actual Hz). `transposeSemitones` is how many
 * semitones a written note sits ABOVE the concert pitch it sounds:
 *
 *   writtenMidi = concertMidi + transposeSemitones
 *
 * e.g. a tenor (Bb) player reading written D5 sounds concert C4, so a concert
 * C4 is *displayed* as D5 → +14 semitones (a major ninth).
 */

export type InstrumentId = 'tenor_sax' | 'alto_sax' | 'soprano_sax' | 'bari_sax'

export interface Instrument {
  id: InstrumentId
  /** Human-facing label. */
  label: string
  /** Filename prefix for fingering chart assets, e.g. "tenor_sax-Bb3.svg". */
  fileKey: string
  /** Semitones a written note sits above the concert pitch it sounds. */
  transposeSemitones: number
  /** Written range (inclusive) as note names, used to bound drills/charts. */
  writtenRange: { low: string; high: string }
}

export const INSTRUMENTS: Record<InstrumentId, Instrument> = {
  // Bb tenor: concert → written is a major ninth up (+14).
  tenor_sax: {
    id: 'tenor_sax',
    label: 'Tenor Sax (B♭)',
    fileKey: 'tenor_sax',
    transposeSemitones: 14,
    writtenRange: { low: 'Bb3', high: 'F6' },
  },
  // Eb alto: concert → written is a major sixth up (+9).
  alto_sax: {
    id: 'alto_sax',
    label: 'Alto Sax (E♭)',
    fileKey: 'alto_sax',
    transposeSemitones: 9,
    writtenRange: { low: 'Bb3', high: 'F6' },
  },
  // Bb soprano: concert → written is a major second up (+2).
  soprano_sax: {
    id: 'soprano_sax',
    label: 'Soprano Sax (B♭)',
    fileKey: 'soprano_sax',
    transposeSemitones: 2,
    writtenRange: { low: 'Bb3', high: 'F6' },
  },
  // Eb bari: an octave below alto, concert → written is +21.
  bari_sax: {
    id: 'bari_sax',
    label: 'Baritone Sax (E♭)',
    fileKey: 'bari_sax',
    transposeSemitones: 21,
    writtenRange: { low: 'Bb3', high: 'F6' },
  },
}

/** The single instrument supported in the POC. */
export const DEFAULT_INSTRUMENT: InstrumentId = 'tenor_sax'

export const INSTRUMENT_LIST: Instrument[] = Object.values(INSTRUMENTS)
