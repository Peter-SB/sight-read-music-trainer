import { keysForConcertNote } from '../config/fingeringMap'
import { KEY_LIST, type KeyId } from '../config/keys'
import type { InstrumentId } from '../config/instruments'
import { DIAGRAM_VIEWBOX, DIVIDER_Y, KEY_POSITIONS } from './fingeringLayout'

/**
 * @deprecated Unused. Replaced by {@link ../ui/FingeringDiagram}, which
 * composites real fingering-chart artwork instead of drawing hand-placed
 * SVG circles. Kept around rather than deleted.
 */

/**
 * Rendered fingering diagram for the note being played, built from
 * {@link keysForConcertNote} rather than a static per-note image. In the POC
 * this is always on (no reveal delay — that's the MVP's core learning
 * mechanic).
 */

interface FingeringChartProps {
  /** Concert-pitch note name to look up, or null when nothing is playing. */
  concertNoteName: string | null
  instrument: InstrumentId
}

export function FingeringChart({
  concertNoteName,
  instrument,
}: FingeringChartProps) {
  if (concertNoteName === null) {
    return (
      <div className="fingering fingering--empty" aria-hidden="true">
        <span>Fingering</span>
      </div>
    )
  }

  const pressed = keysForConcertNote(concertNoteName, instrument)

  if (pressed === null) {
    return (
      <div className="fingering fingering--missing">
        <span>No fingering for {concertNoteName}</span>
      </div>
    )
  }

  const pressedSet = new Set<KeyId>(pressed)

  return (
    <div className="fingering">
      <svg
        viewBox={`0 0 ${DIAGRAM_VIEWBOX.width} ${DIAGRAM_VIEWBOX.height}`}
        className="fingering__diagram"
        role="img"
        aria-label={`Fingering for concert ${concertNoteName}`}
      >
        <line
          x1={20}
          y1={DIVIDER_Y}
          x2={DIAGRAM_VIEWBOX.width - 20}
          y2={DIVIDER_Y}
          className="fingering__divider"
        />
        {KEY_LIST.map((key) => {
          const pos = KEY_POSITIONS[key.id]
          return (
            <circle
              key={key.id}
              cx={pos.x}
              cy={pos.y}
              r={pos.r}
              className={
                pressedSet.has(key.id)
                  ? 'fingering__key fingering__key--pressed'
                  : 'fingering__key'
              }
            >
              <title>{key.label}</title>
            </circle>
          )
        })}
      </svg>
    </div>
  )
}
