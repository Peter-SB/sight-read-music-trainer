import type { KeyId } from '../config/keys'

/**
 * @deprecated Unused. Replaced by the image-composited diagram in
 * {@link ../ui/FingeringDiagram} (see `fingeringDiagramAssets.ts`), which
 * renders from real fingering-chart artwork instead of hand-placed SVG
 * coordinates. Kept around rather than deleted; {@link ../ui/FingeringChart}
 * (the SVG diagram that consumes this layout) is likewise unused.
 */

/**
 * Layout for rendering a fingering diagram. Positions are schematic (a 2D
 * diagram, not a photo overlay) but arranged to match real saxophone
 * anatomy rather than a plain straight column:
 *   - the octave key and palm keys cluster at the top, near the left thumb
 *   - the side keys (reached by the right hand curling up) sit upper-right,
 *     roughly level with L1/L2
 *   - the left-pinky cluster (G#/C#/B/Bb) fans below-left of L3, where the
 *     left pinky actually rests
 *   - the right-pinky cluster (C/Eb) sits below R3
 * Coordinates are in the diagram's SVG viewBox units.
 */

export interface KeyPosition {
  x: number
  y: number
  /** Circle radius. */
  r: number
}

export const DIAGRAM_VIEWBOX = { width: 220, height: 340 }

const COLUMN_X = 120

export const KEY_POSITIONS: Record<KeyId, KeyPosition> = {
  // Palm keys (left hand heel), fanned above/left of the octave key.
  palmD: { x: 70, y: 22, r: 8 },
  palmEb: { x: 92, y: 14, r: 8 },
  palmF: { x: 114, y: 22, r: 8 },

  // Octave key (left thumb).
  octave: { x: COLUMN_X - 30, y: 75, r: 10 },

  // Main left-hand column.
  L1: { x: COLUMN_X, y: 60, r: 12 },
  L2: { x: COLUMN_X, y: 98, r: 12 },
  L3: { x: COLUMN_X, y: 136, r: 12 },

  // Side keys, level with L1/L2, reached from the right hand.
  sideBb: { x: 178, y: 70, r: 7 },
  sideC: { x: 190, y: 92, r: 7 },
  sideE: { x: 178, y: 114, r: 7 },
  frontF: { x: 190, y: 136, r: 7 },

  // Left pinky cluster, fanned below-left of L3.
  lpGSharp: { x: COLUMN_X + 42, y: 128, r: 7 },
  lpCSharp: { x: 58, y: 164, r: 7 },
  lpB: { x: 44, y: 184, r: 7 },
  lpBb: { x: 36, y: 206, r: 7 },

  // Main right-hand column.
  R1: { x: COLUMN_X, y: 184, r: 12 },
  R2: { x: COLUMN_X, y: 222, r: 12 },
  R3: { x: COLUMN_X, y: 260, r: 12 },

  // Right pinky cluster, below R3.
  rpC: { x: 100, y: 288, r: 7 },
  rpEb: { x: 140, y: 288, r: 7 },
}

/** Divider between the left-hand and right-hand key groups, for a visual gap. */
export const DIVIDER_Y = 158
