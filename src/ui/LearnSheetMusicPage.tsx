import { useEffect, useMemo, useRef, useState } from 'react'
import {
  checkBackendHealth,
  deleteTranscription,
  getTranscription,
  listTranscriptions,
  transcribeSheet,
  type SheetInstrument,
  type TranscribeResult,
  type TranscriptionSummary,
} from '../api/omrClient'
import { midiToNoteName, noteNameToMidi } from '../audio/noteMapper'
import { concertToWrittenNoteName } from '../audio/transposition'
import type { InstrumentId } from '../config/instruments'
import { FingeringDiagram } from './FingeringDiagram'
import { SheetMusic } from './SheetMusic'

/**
 * "Learn sheet music" screen: upload a PDF/image of sheet music, transcribe it
 * via the optional OMR backend, and render the extracted notes on the staff.
 *
 * Fully client-side except for the transcribe call. On mount it probes the
 * backend; if it's down the screen still renders and explains that transcription
 * is offline, only the upload control is disabled. Navigation here never depends
 * on the backend.
 */

interface LearnSheetMusicPageProps {
  onBack: () => void
}

/**
 * Semitones the *written* note on the sheet sits above the concert pitch it
 * sounds, per instrument the sheet is written for. Mirrors
 * {@link ../config/instruments}, plus a `concert` (piano / C-instrument) entry.
 */
const SHEET_TRANSPOSE: Record<SheetInstrument, number> = {
  concert: 0,
  soprano_sax: 2,
  alto_sax: 9,
  tenor_sax: 14,
  bari_sax: 21,
}

const INSTRUMENT_OPTIONS: { id: SheetInstrument; label: string }[] = [
  { id: 'concert', label: 'Concert / Piano (C)' },
  { id: 'alto_sax', label: 'Alto Sax (E♭)' },
  { id: 'tenor_sax', label: 'Tenor Sax (B♭)' },
  { id: 'soprano_sax', label: 'Soprano Sax (B♭)' },
  { id: 'bari_sax', label: 'Baritone Sax (E♭)' },
]

/** How many notes to draw per staff row. */
const NOTES_PER_ROW = 8

/** Written note name -> concert-pitch note name for the given sheet instrument. */
function toConcert(writtenNoteName: string, instrument: SheetInstrument): string {
  const midi = noteNameToMidi(writtenNoteName)
  if (midi === null) return writtenNoteName
  return midiToNoteName(midi - SHEET_TRANSPOSE[instrument])
}

/** Sax instruments double as {@link InstrumentId} for fingering lookup; "concert" (piano) has none. */
function fingeringInstrument(instrument: SheetInstrument): InstrumentId | null {
  return instrument === 'concert' ? null : instrument
}

/** Widest manual transpose the +/- stepper allows, in semitones (one octave either way). */
const MAX_TRANSPOSE_SEMITONES = 12

/** Shift a note name by a number of semitones. Passes through unparseable names unchanged. */
function shiftBySemitones(noteName: string, semitones: number): string {
  if (semitones === 0) return noteName
  const midi = noteNameToMidi(noteName)
  return midi === null ? noteName : midiToNoteName(midi + semitones)
}

function chunk<T>(items: T[], size: number): T[][] {
  const rows: T[][] = []
  for (let i = 0; i < items.length; i += size) rows.push(items.slice(i, i + size))
  return rows
}

/** Format a unix-epoch-seconds timestamp as a short local date+time. */
function formatWhen(epochSeconds: number): string {
  return new Date(epochSeconds * 1000).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

type BackendStatus = 'checking' | 'available' | 'unavailable'

export function LearnSheetMusicPage({ onBack }: LearnSheetMusicPageProps) {
  const [backend, setBackend] = useState<BackendStatus>('checking')
  const [instrument, setInstrument] = useState<SheetInstrument>('concert')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<TranscribeResult | null>(null)
  const [saved, setSaved] = useState<TranscriptionSummary[]>([])
  const [showFingering, setShowFingering] = useState(false)
  // What to display the current result *as* — independent of the instrument the
  // sheet was written/transcribed for, so a saved tune can be viewed/practiced
  // on a different horn without re-transcribing.
  const [viewInstrument, setViewInstrument] = useState<SheetInstrument>('concert')
  const [transpose, setTranspose] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const refreshSaved = () => {
    void listTranscriptions().then(setSaved)
  }

  // Probe the backend once on mount. Non-blocking: the page renders regardless.
  useEffect(() => {
    let cancelled = false
    void checkBackendHealth().then((ok) => {
      if (cancelled) return
      setBackend(ok ? 'available' : 'unavailable')
      if (ok) refreshSaved()
    })
    return () => {
      cancelled = true
    }
  }, [])

  const recheck = () => {
    setBackend('checking')
    void checkBackendHealth().then((ok) => {
      setBackend(ok ? 'available' : 'unavailable')
      if (ok) refreshSaved()
    })
  }

  // Concert pitch is the fixed source of truth for a result: it's derived once
  // from the notes as written for the instrument they were *transcribed* for,
  // not the live "view as" selector below.
  const concertNotes = useMemo(() => {
    if (!result) return []
    return result.notes.map((n) => toConcert(n, result.instrument as SheetInstrument))
  }, [result])

  const shiftedConcertNotes = useMemo(
    () => concertNotes.map((n) => shiftBySemitones(n, transpose)),
    [concertNotes, transpose],
  )

  // What's actually drawn on the staff: the transposed concert pitch, reworked
  // into the "view as" instrument's written notation (or left as concert/piano
  // notation when viewing as Concert).
  const displayNotes = useMemo(() => {
    if (viewInstrument === 'concert') return shiftedConcertNotes
    return shiftedConcertNotes.map((n) => concertToWrittenNoteName(n, viewInstrument) ?? n)
  }, [shiftedConcertNotes, viewInstrument])

  const onSubmit = async () => {
    if (!file) return
    setBusy(true)
    setError(null)
    setResult(null)
    try {
      const res = await transcribeSheet(file, instrument)
      setResult(res)
      setViewInstrument(instrument)
      setTranspose(0)
      refreshSaved()
      if (res.notes.length === 0) {
        setError('No notes were recognised in that image.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transcription failed.')
    } finally {
      setBusy(false)
    }
  }

  const onView = async (id: string) => {
    setError(null)
    try {
      const item = await getTranscription(id)
      // `result.instrument` (used to derive concert pitch) reflects how the sheet
      // was actually transcribed and never changes; default the *view* to the
      // same instrument, but leave it free to switch afterward. Also mirror the
      // upload dropdown so it matches what's currently loaded.
      setInstrument(item.instrument as SheetInstrument)
      setViewInstrument(item.instrument as SheetInstrument)
      setTranspose(0)
      setResult({
        id: item.id,
        instrument: item.instrument,
        key: item.key,
        notes: item.notes,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load transcription.')
    }
  }

  const onDelete = async (id: string) => {
    const ok = await deleteTranscription(id)
    if (ok) {
      refreshSaved()
      if (result?.id === id) setResult(null)
    }
  }

  const canUpload = backend === 'available' && !!file && !busy

  return (
    <div className="page">
      <header className="page__header">
        <button type="button" className="link-button" onClick={onBack}>
          ← Home
        </button>
        <h2>Learn sheet music</h2>
        <span aria-hidden="true" />
      </header>

      <div className="sheet-upload">
        <div className="sheet-upload__status">
          <span
            className={`status-dot status-dot--${
              backend === 'available'
                ? 'running'
                : backend === 'checking'
                  ? 'requesting'
                  : 'error'
            }`}
            aria-hidden="true"
          />
          {backend === 'available' && 'Transcription backend connected'}
          {backend === 'checking' && 'Checking transcription backend…'}
          {backend === 'unavailable' && (
            <>
              Transcription backend unavailable — upload is offline.{' '}
              <button type="button" className="link-button" onClick={recheck}>
                Retry
              </button>
            </>
          )}
        </div>

        <label className="sheet-upload__field">
          <span>Sheet is written for</span>
          <select
            value={instrument}
            onChange={(e) => setInstrument(e.target.value as SheetInstrument)}
          >
            {INSTRUMENT_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label className="sheet-upload__field">
          <span>Sheet music file (PDF or image)</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,image/*"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null)
              setError(null)
            }}
          />
        </label>

        <button
          type="button"
          className="mic-button"
          disabled={!canUpload}
          onClick={onSubmit}
        >
          {busy ? 'Transcribing…' : 'Transcribe'}
        </button>

        {busy && (
          <p className="sheet-upload__hint">
            Transcription can take a minute or two — optical music recognition is
            compute-heavy. Leave this tab open.
          </p>
        )}

        {error && (
          <div className="banner banner--error" role="alert">
            {error}
          </div>
        )}
      </div>

      {backend === 'available' && saved.length > 0 && (
        <section className="saved-list">
          <h3 className="saved-list__title">Saved transcriptions</h3>
          <ul className="saved-list__items">
            {saved.map((item) => (
              <li key={item.id} className="saved-item">
                <button
                  type="button"
                  className="saved-item__open"
                  onClick={() => onView(item.id)}
                >
                  <span className="saved-item__name">{item.name}</span>
                  <span className="saved-item__meta">
                    {item.key} · {item.note_count} notes ·{' '}
                    {INSTRUMENT_OPTIONS.find((o) => o.id === item.instrument)?.label ??
                      item.instrument}{' '}
                    · {formatWhen(item.created_at)}
                  </span>
                </button>
                <button
                  type="button"
                  className="link-button saved-item__delete"
                  aria-label={`Delete ${item.name}`}
                  onClick={() => onDelete(item.id)}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {result && displayNotes.length > 0 && (
        <section className="sheet-result">
          <div className="sheet-result__header">
            <p className="sheet-result__meta">
              Key: <strong>{result.key}</strong> · {displayNotes.length} notes ·
              shown for {INSTRUMENT_OPTIONS.find((o) => o.id === viewInstrument)?.label}
              {transpose !== 0 && ` · transposed ${transpose > 0 ? '+' : ''}${transpose} semitones`}
            </p>
            <button
              type="button"
              role="switch"
              aria-checked={showFingering}
              disabled={fingeringInstrument(viewInstrument) === null}
              className={`pill-toggle ${showFingering ? 'pill-toggle--on' : ''}`}
              onClick={() => setShowFingering((v) => !v)}
              title={
                fingeringInstrument(viewInstrument) === null
                  ? 'Fingering charts are only available for saxophone'
                  : undefined
              }
            >
              <span className="pill-toggle__knob" aria-hidden="true" />
              Show fingering
            </button>
          </div>

          <div className="sheet-result__controls">
            <label className="sheet-upload__field">
              <span>View / play as</span>
              <select
                value={viewInstrument}
                onChange={(e) => setViewInstrument(e.target.value as SheetInstrument)}
              >
                {INSTRUMENT_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="transpose-control">
              <span className="transpose-control__label">Transpose</span>
              <button
                type="button"
                className="transpose-control__step"
                aria-label="Transpose down one semitone"
                disabled={transpose <= -MAX_TRANSPOSE_SEMITONES}
                onClick={() => setTranspose((t) => Math.max(t - 1, -MAX_TRANSPOSE_SEMITONES))}
              >
                −
              </button>
              <span className="transpose-control__value">
                {transpose > 0 ? `+${transpose}` : transpose}
              </span>
              <button
                type="button"
                className="transpose-control__step"
                aria-label="Transpose up one semitone"
                disabled={transpose >= MAX_TRANSPOSE_SEMITONES}
                onClick={() => setTranspose((t) => Math.min(t + 1, MAX_TRANSPOSE_SEMITONES))}
              >
                +
              </button>
              {transpose !== 0 && (
                <button
                  type="button"
                  className="link-button"
                  onClick={() => setTranspose(0)}
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {chunk(displayNotes, NOTES_PER_ROW).map((row, i) => {
            const fingeringId = showFingering ? fingeringInstrument(viewInstrument) : null
            const concertRow = shiftedConcertNotes.slice(i * NOTES_PER_ROW, i * NOTES_PER_ROW + row.length)
            return (
              <div key={i} className="sheet-result__row">
                <SheetMusic
                  notes={row}
                  width={NOTES_PER_ROW}
                  showNoteNames
                  className="sheet-result__staff"
                />
                {fingeringId && (
                  <div
                    className="sheet-result__fingerings"
                    style={{ gridTemplateColumns: `repeat(${NOTES_PER_ROW}, 1fr)` }}
                  >
                    {concertRow.map((note, j) => (
                      <FingeringDiagram key={j} concertNoteName={note} instrument={fingeringId} />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </section>
      )}
    </div>
  )
}
