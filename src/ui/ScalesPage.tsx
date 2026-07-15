import { useMemo } from "react";
import { formatNoteNameForDisplay } from "../audio/noteMapper";
import {
  concertToWrittenNoteName,
  toConcertNoteName,
  writtenPitchClassToConcert,
} from "../audio/transposition";
import { INSTRUMENTS, type InstrumentId } from "../config/instruments";
import { SCALE_LIST, SCALE_ROOTS, type ScaleId } from "../config/scales";
import type { KeyMode } from "../config/settings";
import { generateScale, allNotesInRange } from "../drill/scaleGenerator";
import { FingeringDiagram } from "./FingeringDiagram";
import { SheetMusic } from "./SheetMusic";

interface ScalesPageProps {
  instrument: InstrumentId;
  /** Persisted from the last visit to this page (session settings), so selections survive navigation. */
  scaleId: ScaleId;
  root: string;
  keyMode: KeyMode;
  rangeLow: string;
  rangeHigh: string;
  onScaleIdChange: (scaleId: ScaleId) => void;
  onRootChange: (root: string) => void;
  onKeyModeChange: (keyMode: KeyMode) => void;
  onRangeLowChange: (rangeLow: string) => void;
  onRangeHighChange: (rangeHigh: string) => void;
  onStartDrill: (
    scaleId: ScaleId,
    rootPitchClass: string,
    rangeLow: string,
    rangeHigh: string,
    randomOrder: boolean,
  ) => void;
  onBack: () => void;
}

export function ScalesPage({
  instrument,
  scaleId,
  root,
  keyMode,
  rangeLow,
  rangeHigh,
  onScaleIdChange,
  onRootChange,
  onKeyModeChange,
  onRangeLowChange,
  onRangeHighChange,
  onStartDrill,
  onBack,
}: ScalesPageProps) {
  // Written range for this instrument bounds the selectable range, same as Settings.
  const rangeOptions = useMemo(
    () => allNotesInRange(INSTRUMENTS[instrument].writtenRange),
    [instrument],
  );

  // generateScale always expects a concert-pitch root; resolve here so the
  // rest of the page (and the drill it starts) never has to think about mode.
  const concertRoot = useMemo(() => {
    if (keyMode === "concert") return root;
    return writtenPitchClassToConcert(root, instrument) ?? root;
  }, [root, keyMode, instrument]);

  const sequence = useMemo(() => {
    const low = toConcertNoteName(rangeLow, instrument);
    const high = toConcertNoteName(rangeHigh, instrument);
    if (!low || !high) return [];
    return generateScale(concertRoot, scaleId, { low, high });
  }, [instrument, concertRoot, scaleId, rangeLow, rangeHigh]);

  return (
    <div className="page">
      <header className="page__header">
        <button type="button" className="link-button" onClick={onBack}>
          ← Home
        </button>
        <h2>Scales</h2>
      </header>

      <div className="scales-controls">
        <label className="field">
          <span>Key shown in</span>
          <select
            value={keyMode}
            onChange={(e) => onKeyModeChange(e.target.value as KeyMode)}
          >
            <option value="concert">Concert pitch</option>
            <option value="written">
              {INSTRUMENTS[instrument].label} (written)
            </option>
          </select>
        </label>

        <label className="field">
          <span>
            Root {keyMode === "written" ? "(as written)" : "(concert)"}
          </span>
          <select value={root} onChange={(e) => onRootChange(e.target.value)}>
            {SCALE_ROOTS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          {keyMode === "written" && root !== concertRoot && (
            <span className="field__hint">sounds concert {concertRoot}</span>
          )}
        </label>

        <label className="field">
          <span>Scale</span>
          <select
            value={scaleId}
            onChange={(e) => onScaleIdChange(e.target.value as ScaleId)}
          >
            {SCALE_LIST.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Range low</span>
          <select
            value={rangeLow}
            onChange={(e) => onRangeLowChange(e.target.value)}
          >
            {rangeOptions.map((note) => (
              <option key={note} value={note}>
                {note}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Range high</span>
          <select
            value={rangeHigh}
            onChange={(e) => onRangeHighChange(e.target.value)}
          >
            {rangeOptions.map((note) => (
              <option key={note} value={note}>
                {note}
              </option>
            ))}
          </select>
        </label>

        <div className="scales-controls__actions">
          <button
            type="button"
            className="mic-button mic-button--primary"
            disabled={sequence.length === 0}
            onClick={() =>
              onStartDrill(scaleId, concertRoot, rangeLow, rangeHigh, false)
            }
          >
            Start drill
          </button>
          <button
            type="button"
            className="mic-button"
            disabled={sequence.length === 0}
            onClick={() =>
              onStartDrill(scaleId, concertRoot, rangeLow, rangeHigh, true)
            }
          >
            Drill random
          </button>
        </div>
      </div>

      <div className="scale-preview">
        {sequence.map((concertNote) => {
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
        {sequence.length === 0 && (
          <p>No notes fit this scale/range combination.</p>
        )}
      </div>
    </div>
  );
}
