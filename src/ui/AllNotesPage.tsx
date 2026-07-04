import { useMemo, useState } from "react";
import { formatNoteNameForDisplay } from "../audio/noteMapper";
import {
  concertToWrittenNoteName,
  toConcertNoteName,
} from "../audio/transposition";
import type { InstrumentId } from "../config/instruments";
import { allNotesInRange } from "../drill/scaleGenerator";
import { getAverageDelay } from "../drill/noteScores";
import { FingeringDiagram } from "./FingeringDiagram";
import { SheetMusic } from "./SheetMusic";

interface AllNotesPageProps {
  instrument: InstrumentId;
  rangeLow: string;
  rangeHigh: string;
  onBack: () => void;
}

/** Red (slowest) -> orange -> green (fastest), scaled relative to the other displayed notes' scores. */
function scoreColor(avgMs: number, minMs: number, maxMs: number): string {
  if (maxMs === minMs) return "hsl(140, 65%, 45%)";
  const normalized = (avgMs - minMs) / (maxMs - minMs); // 0 = fastest, 1 = slowest
  const hue = 130 - normalized * 130;
  return `hsl(${hue}, 70%, 45%)`;
}

export function AllNotesPage({
  instrument,
  rangeLow,
  rangeHigh,
  onBack,
}: AllNotesPageProps) {
  const [showScores, setShowScores] = useState(false);

  const concertNotes = useMemo(() => {
    const low = toConcertNoteName(rangeLow, instrument);
    const high = toConcertNoteName(rangeHigh, instrument);
    if (!low || !high) return [];
    return allNotesInRange({ low, high });
  }, [instrument, rangeLow, rangeHigh]);

  // Recomputed each time scores are shown, so the coloring reflects the latest practice data.
  const { averages, minMs, maxMs } = useMemo(() => {
    const entries = concertNotes.map(
      (note) => [note, getAverageDelay(note)] as const,
    );
    const known = entries
      .map(([, avg]) => avg)
      .filter((avg): avg is number => avg !== null);
    return {
      averages: new Map(entries),
      minMs: known.length > 0 ? Math.min(...known) : 0,
      maxMs: known.length > 0 ? Math.max(...known) : 0,
    };
  }, [concertNotes, showScores]);

  return (
    <div className="page">
      <header className="page__header">
        <button type="button" className="link-button" onClick={onBack}>
          ← Home
        </button>
        <h2>All notes &amp; fingerings</h2>
        <button
          type="button"
          role="switch"
          aria-checked={showScores}
          className={`pill-toggle page__header-toggle ${showScores ? "pill-toggle--on" : ""}`}
          onClick={() => setShowScores((v) => !v)}
        >
          <span className="pill-toggle__knob" aria-hidden="true" />
          Show note scores
        </button>
      </header>

      <div className="scale-preview ">
        {concertNotes.map((concertNote) => {
          const written = concertToWrittenNoteName(concertNote, instrument);
          // Spell the staff the same way the label reads (sharps, matching
          // formatNoteNameForDisplay) so glyph and position agree with the name.
          const displayName = written
            ? formatNoteNameForDisplay(written)
            : concertNote;
          const avgMs = averages.get(concertNote) ?? null;
          return (
            <div key={concertNote} className="scale-preview__note">
              <FingeringDiagram
                concertNoteName={concertNote}
                instrument={instrument}
              />
              <span className="scale-preview__note-name">{displayName}</span>
              {showScores && (
                <span
                  className="scale-preview__score"
                  style={{
                    color:
                      avgMs !== null
                        ? scoreColor(avgMs, minMs, maxMs)
                        : undefined,
                  }}
                >
                  {avgMs !== null ? `${Math.round(avgMs)}ms` : "–"}
                </span>
              )}
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
