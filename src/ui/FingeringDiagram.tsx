import { keysForConcertNote } from '../config/fingeringMap'
import type { KeyId } from '../config/keys'
import type { InstrumentId } from '../config/instruments'
import {
  CIRCLE_KEY_POSITIONS,
  DIAGRAM_BASE_IMAGE,
  DIAGRAM_CANVAS,
  IMAGE_ASPECT_RATIO,
  KEY_IMAGES,
} from './fingeringDiagramAssets'

/**
 * Rendered fingering diagram for the note being played, built from
 * {@link keysForConcertNote} and composited from real fingering-chart
 * artwork: a base outline image plus one highlight image per pressed
 * auxiliary key, stacked on top (see {@link fingeringDiagramAssets} for
 * where that art comes from). The six main column keys and three palm keys
 * have no dedicated art, so those are drawn as plain filled circles instead.
 *
 * Replaces the hand-drawn SVG diagram in {@link FingeringChart} — kept
 * around unused rather than deleted.
 */

interface FingeringDiagramProps {
  /** Concert-pitch note name to look up, or null when nothing is playing. */
  concertNoteName: string | null
  instrument: InstrumentId
}

export function FingeringDiagram({ concertNoteName, instrument }: FingeringDiagramProps) {
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

  const imageKeys = pressed.filter((key): key is KeyId => key in KEY_IMAGES)
  const circleKeys = pressed.filter((key): key is KeyId => key in CIRCLE_KEY_POSITIONS)

  return (
    <div className="fingering">
      <div
        className="fingering-diagram"
        style={{ aspectRatio: IMAGE_ASPECT_RATIO }}
        role="img"
        aria-label={`Fingering for concert ${concertNoteName}`}
      >
        <img className="fingering-diagram__layer" src={DIAGRAM_BASE_IMAGE} alt="" />
        {imageKeys.map((key) => (
          <img key={key} className="fingering-diagram__layer" src={KEY_IMAGES[key]} alt="" />
        ))}
        {circleKeys.length > 0 && (
          <svg
            className="fingering-diagram__layer"
            viewBox={`0 0 ${DIAGRAM_CANVAS.width} ${DIAGRAM_CANVAS.height}`}
          >
            {circleKeys.map((key) => {
              const pos = CIRCLE_KEY_POSITIONS[key]!
              return (
                <circle
                  key={key}
                  cx={pos.x}
                  cy={pos.y}
                  r={pos.r}
                  className="fingering-diagram__key"
                />
              )
            })}
          </svg>
        )}
      </div>
    </div>
  )
}
