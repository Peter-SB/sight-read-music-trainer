import type { NoteReading } from '../audio/types'
import { formatNoteNameForDisplay } from '../audio/noteMapper'
import { forDisplay } from '../audio/transposition'
import type { InstrumentId } from '../config/instruments'
import { SheetMusic } from './SheetMusic'

/**
 * The centrepiece: the note currently being played, shown large. Displays the
 * *written* note for the selected instrument (what the player reads), with the
 * concert pitch and cents deviation as secondary detail.
 */

interface NoteDisplayProps {
  /** Latest concert-pitch reading, or null when nothing confident is heard. */
  note: NoteReading | null
  instrument: InstrumentId
  listening: boolean
}

export function NoteDisplay({ note, instrument, listening }: NoteDisplayProps) {
  if (!note) {
    return (
      <div className="note-display note-display--empty">
        <span className="note-name note-name--placeholder">
          {listening ? '—' : '···'}
        </span>
        <span className="note-detail">
          {listening ? 'Play a note' : 'Not listening'}
        </span>
      </div>
    )
  }

  const written = forDisplay(note, instrument)
  const centsLabel =
    written.cents === 0
      ? 'in tune'
      : `${written.cents > 0 ? '+' : ''}${written.cents}¢`
  const displayName = formatNoteNameForDisplay(written.noteName)

  return (
    <div className="note-display">
      <span className="note-name">{displayName}</span>
      <SheetMusic notes={[displayName]} className="note-display__staff" />
      <span className="note-detail">
        <span className={centsClass(written.cents)}>{centsLabel}</span>
        <span className="note-detail__sep">·</span>
        concert {formatNoteNameForDisplay(note.noteName)}
      </span>
    </div>
  )
}

function centsClass(cents: number): string {
  if (Math.abs(cents) <= 5) return 'cents cents--in-tune'
  return cents > 0 ? 'cents cents--sharp' : 'cents cents--flat'
}
