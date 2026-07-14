/**
 * Client for the optional OMR (sheet-music transcription) backend.
 *
 * The backend is optional: the app is fully client-side and this is the *only*
 * network dependency. Every function here fails soft — {@link checkBackendHealth}
 * resolves to `false` rather than throwing so callers can render a degraded
 * state without a try/catch, and {@link transcribeSheet} throws a plain-message
 * Error the UI can show inline.
 */

/** Where the FastAPI backend runs during local dev (POC: hardcoded). */
export const OMR_BACKEND_URL = 'http://localhost:8010'

/** What instrument an uploaded sheet is written for; drives transposition. */
export type SheetInstrument =
  | 'concert'
  | 'alto_sax'
  | 'tenor_sax'
  | 'soprano_sax'
  | 'bari_sax'

export interface TranscribeResult {
  /** Storage id of the saved transcription. */
  id: string
  /** Instrument the sheet was declared to be written for (echoed back). */
  instrument: string
  /** Notated/analysed key signature, e.g. "G major". */
  key: string
  /** Ordered note names exactly as printed, e.g. ["C#4", "E4"]. No timing. */
  notes: string[]
}

/** List-view summary of a saved transcription (no note list). */
export interface TranscriptionSummary {
  id: string
  /** Original uploaded filename. */
  name: string
  instrument: string
  key: string
  note_count: number
  /** Unix epoch seconds. */
  created_at: number
}

/** A full saved transcription, as returned by {@link getTranscription}. */
export interface SavedTranscription extends TranscriptionSummary {
  notes: string[]
}

/**
 * Ping the backend's /health endpoint. Resolves `true` when reachable and OK,
 * `false` on any error/timeout. Never throws.
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${OMR_BACKEND_URL}/health`, {
      signal: AbortSignal.timeout(2000),
    })
    if (!res.ok) return false
    const body = (await res.json()) as { status?: string }
    return body.status === 'ok'
  } catch {
    return false
  }
}

/**
 * Upload a sheet-music file for transcription. Throws an Error with a
 * user-presentable message on failure (network, unsupported file, OMR error).
 */
export async function transcribeSheet(
  file: File,
  instrument: SheetInstrument,
): Promise<TranscribeResult> {
  const form = new FormData()
  form.append('file', file)
  form.append('instrument', instrument)

  let res: Response
  try {
    res = await fetch(`${OMR_BACKEND_URL}/transcribe`, {
      method: 'POST',
      body: form,
      // OMR is genuinely slow — a single sheet can take several minutes of CPU,
      // plus a one-time model download on the very first run. Allow 10 minutes.
      signal: AbortSignal.timeout(600_000),
    })
  } catch {
    throw new Error(
      'Could not reach the transcription backend. Is it running on port 8000?',
    )
  }

  if (!res.ok) {
    let detail = `Transcription failed (HTTP ${res.status}).`
    try {
      const body = (await res.json()) as { detail?: string }
      if (body.detail) detail = body.detail
    } catch {
      // Non-JSON error body — keep the generic message.
    }
    throw new Error(detail)
  }

  return (await res.json()) as TranscribeResult
}

/** List saved transcriptions (newest first). Returns [] on any error. */
export async function listTranscriptions(): Promise<TranscriptionSummary[]> {
  try {
    const res = await fetch(`${OMR_BACKEND_URL}/transcriptions`, {
      signal: AbortSignal.timeout(4000),
    })
    if (!res.ok) return []
    return (await res.json()) as TranscriptionSummary[]
  } catch {
    return []
  }
}

/** Fetch one saved transcription in full (with its note list). */
export async function getTranscription(id: string): Promise<SavedTranscription> {
  const res = await fetch(`${OMR_BACKEND_URL}/transcriptions/${id}`, {
    signal: AbortSignal.timeout(4000),
  })
  if (!res.ok) throw new Error(`Could not load transcription (HTTP ${res.status}).`)
  return (await res.json()) as SavedTranscription
}

/** Delete a saved transcription. Returns true on success. */
export async function deleteTranscription(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${OMR_BACKEND_URL}/transcriptions/${id}`, {
      method: 'DELETE',
      signal: AbortSignal.timeout(4000),
    })
    return res.ok
  } catch {
    return false
  }
}
