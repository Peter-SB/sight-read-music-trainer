import { useMemo } from "react";
import { formatNoteNameForDisplay } from "../audio/noteMapper";
import {
  concertToWrittenNoteName,
  toConcertNoteName,
} from "../audio/transposition";
import type { InstrumentId } from "../config/instruments";
import { allNotesInRange } from "../drill/scaleGenerator";
import { FingeringDiagram } from "./FingeringDiagram";
import { SheetMusic } from "./SheetMusic";

interface AllNotesPageProps {
  instrument: InstrumentId;
  rangeLow: string;
  rangeHigh: string;
  onBack: () => void;
}

export function AllNotesPage({
  instrument,
  rangeLow,
  rangeHigh,
  onBack,
}: AllNotesPageProps) {
  const concertNotes = useMemo(() => {
    const low = toConcertNoteName(rangeLow, instrument);
    const high = toConcertNoteName(rangeHigh, instrument);
    if (!low || !high) return [];
    return allNotesInRange({ low, high });
  }, [instrument, rangeLow, rangeHigh]);

  return (
    <div className="page">
      <header className="page__header">
        <button type="button" className="link-button" onClick={onBack}>
          ← Home
        </button>
        <h2>All notes &amp; fingerings</h2>
      </header>

      <div className="scale-preview ">
        {concertNotes.map((concertNote) => {
          const written = concertToWrittenNoteName(concertNote, instrument);
          // Spell the staff the same way the label reads (sharps, matching
          // formatNoteNameForDisplay) so glyph and position agree with the name.
          const displayName = written
            ? formatNoteNameForDisplay(written)
            : concertNote;
          return (
            <div key={concertNote} className="scale-preview__note">
              <FingeringDiagram
                concertNoteName={concertNote}
                instrument={instrument}
              />
              <span className="scale-preview__note-name">{displayName}</span>
              <SheetMusic
                notes={[displayName]}
                className="scale-preview__staff"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
