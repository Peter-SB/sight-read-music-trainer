import { useMemo } from 'react'
import { formatNoteNameForDisplay } from '../audio/noteMapper'
import { concertToWrittenNoteName, toConcertNoteName } from '../audio/transposition'
import type { InstrumentId } from '../config/instruments'
import { allNotesInRange } from '../drill/scaleGenerator'
import { FingeringDiagram } from './FingeringDiagram'

interface AllNotesPageProps {
  instrument: InstrumentId
  rangeLow: string
  rangeHigh: string
  onBack: () => void
}

export function AllNotesPage({
  instrument,
  rangeLow,
  rangeHigh,
  onBack,
}: AllNotesPageProps) {
  const concertNotes = useMemo(() => {
    const low = toConcertNoteName(rangeLow, instrument)
    const high = toConcertNoteName(rangeHigh, instrument)
    if (!low || !high) return []
    return allNotesInRange({ low, high })
  }, [instrument, rangeLow, rangeHigh])

  return (
    <div className="page">
      <header className="page__header">
        <button type="button" className="link-button" onClick={onBack}>
          ← Home
        </button>
        <h2>All notes &amp; fingerings</h2>
      </header>

      <div className="scale-preview">
        {concertNotes.map((concertNote) => {
          const written = concertToWrittenNoteName(concertNote, instrument)
          return (
            <div key={concertNote} className="scale-preview__note">
              <span className="scale-preview__note-name">
                {written ? formatNoteNameForDisplay(written) : concertNote}
              </span>
              <FingeringDiagram concertNoteName={concertNote} instrument={instrument} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
