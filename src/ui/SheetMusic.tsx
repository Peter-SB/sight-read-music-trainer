import {
  ledgerStepsFor,
  parseStaffNote,
  STAFF_BOTTOM_STEP,
  STAFF_LINE_STEPS,
  STAFF_TOP_STEP,
} from "./staffPosition";

/**
 * Renders a list of notes on a plain five-line treble staff, each drawn as a
 * semibreve (whole note) using the shared {@link SEMIBREVE_SRC} artwork, with
 * ledger lines added automatically for notes above or below the staff.
 *
 * Deliberately minimal for now: no clef, no key/time signature — just the five
 * lines and the note heads. Vertical placement comes from {@link staffPosition}
 * (diatonic, so accidentals don't shift a note off its line); the accidental is
 * shown as a small glyph to the left of the head.
 */

const SEMIBREVE_SRC = "/images/1-1_note_semibreve.svg";

/** Half a staff space — the vertical distance per diatonic step. */
const STEP_Y = 6;
/** Native aspect of the semibreve artwork (viewBox 460.174 × 308.906). */
const SEMIBREVE_ASPECT = 460.17404 / 308.906071;
/** Note head is one staff space tall; width follows the artwork's aspect. */
const HEAD_HEIGHT = 2 * STEP_Y;
const HEAD_WIDTH = HEAD_HEIGHT * SEMIBREVE_ASPECT;
/** A ledger line pokes out a little past each side of the head. */
const LEDGER_OVERHANG = 4;
/** Horizontal room each note gets. */
const SLOT_WIDTH = 40;
/** Padding on the left and right of the whole staff. */
const PAD_X = 20;

interface SheetMusicProps {
  /** Written note names to render, e.g. ["E4", "F#5", "Bb3"]. At least one. */
  notes: string[];
  /**
   * Width in note-slots (one slot ≈ one note). Defaults to `notes.length`, so
   * the staff grows with the number of notes; pass a larger value for more
   * breathing room. Notes are always laid out left-to-right, one per slot.
   *
   * This sets the SVG's internal coordinate width (note spacing); the rendered
   * pixel size is governed by the container, so callers size the staff in CSS.
   */
  width?: number;
  /** Extra class on the root `<svg>`, for caller-controlled sizing. */
  className?: string;
}

/** y coordinate of a diatonic step. Higher pitch → smaller y (drawn upward). */
function yForStep(step: number): number {
  return (STAFF_TOP_STEP - step) * STEP_Y;
}

export function SheetMusic({ notes, width, className }: SheetMusicProps) {
  const parsed = notes.map((name) => ({ name, staff: parseStaffNote(name) }));

  const slots = Math.max(width ?? notes.length, notes.length, 1);
  const contentWidth = slots * SLOT_WIDTH + PAD_X * 2;

  // Vertical extent: always include the whole staff, then grow to fit any
  // note heads and ledger lines that sit outside it.
  let minY = yForStep(STAFF_TOP_STEP);
  let maxY = yForStep(STAFF_BOTTOM_STEP);
  for (const { staff } of parsed) {
    if (!staff) continue;
    const cy = yForStep(staff.diatonicStep);
    minY = Math.min(minY, cy - HEAD_HEIGHT / 2);
    maxY = Math.max(maxY, cy + HEAD_HEIGHT / 2);
    for (const ledger of ledgerStepsFor(staff.diatonicStep)) {
      minY = Math.min(minY, yForStep(ledger));
      maxY = Math.max(maxY, yForStep(ledger));
    }
  }
  const PAD_Y = STEP_Y;
  const viewTop = minY - PAD_Y;
  const viewHeight = maxY - minY + PAD_Y * 2;

  return (
    <svg
      className={className ? `sheet-music ${className}` : "sheet-music"}
      viewBox={`0 ${viewTop} ${contentWidth} ${viewHeight}`}
      role="img"
      aria-label={`Staff showing ${notes.join(", ")}`}
    >
      {/* Five staff lines. */}
      {STAFF_LINE_STEPS.map((step) => {
        const y = yForStep(step);
        return (
          <line
            key={step}
            className="sheet-music__staff-line"
            x1={0}
            y1={y}
            x2={contentWidth}
            y2={y}
          />
        );
      })}

      {parsed.map(({ name, staff }, i) => {
        const cx = PAD_X + i * SLOT_WIDTH + SLOT_WIDTH / 2;
        if (!staff) {
          return (
            <text
              key={i}
              className="sheet-music__unknown"
              x={cx}
              y={yForStep(34)}
            >
              ?
            </text>
          );
        }
        const cy = yForStep(staff.diatonicStep);
        return (
          <g key={i}>
            {ledgerStepsFor(staff.diatonicStep).map((ledger) => {
              const y = yForStep(ledger);
              return (
                <line
                  key={ledger}
                  className="sheet-music__ledger"
                  x1={cx - HEAD_WIDTH / 2 - LEDGER_OVERHANG}
                  y1={y}
                  x2={cx + HEAD_WIDTH / 2 + LEDGER_OVERHANG}
                  y2={y}
                />
              );
            })}
            {staff.accidental && (
              <text
                className="sheet-music__accidental"
                x={cx - HEAD_WIDTH / 2 - 3}
                y={cy}
                dominantBaseline="central"
                textAnchor="end"
              >
                {staff.accidental === "#" ? "♯" : "♭"}
              </text>
            )}
            <image
              className="sheet-music__note"
              href={SEMIBREVE_SRC}
              x={cx - HEAD_WIDTH / 2}
              y={cy - HEAD_HEIGHT / 2}
              width={HEAD_WIDTH}
              height={HEAD_HEIGHT}
              preserveAspectRatio="xMidYMid meet"
            >
              <title>{name}</title>
            </image>
          </g>
        );
      })}
    </svg>
  );
}
