import type { KeyId } from '../config/keys'

/**
 * Schematic (not anatomically literal) layout for rendering a fingering
 * diagram: one column for the main six keys plus the octave key, with the
 * pinky/side/palm clusters fanned out around it for legibility. Coordinates
 * are in the diagram's SVG viewBox units.
 */

export interface KeyPosition {
  x: number
  y: number
  /** Circle radius; the octave key gets a slightly larger diamond-ish mark. */
  r: number
}

export const DIAGRAM_VIEWBOX = { width: 200, height: 340 }

const COLUMN_X = 100

export const KEY_POSITIONS: Record<KeyId, KeyPosition> = {
  // Palm keys (left hand heel), above the main column.
  palmEb: { x: 100, y: 20, r: 8 },
  palmD: { x: 78, y: 30, r: 8 },
  palmF: { x: 122, y: 30, r: 8 },

  // Octave key (left thumb).
  octave: { x: 62, y: 55, r: 9 },

  // Main left-hand column.
  L1: { x: COLUMN_X, y: 55, r: 11 },
  L2: { x: COLUMN_X, y: 90, r: 11 },
  L3: { x: COLUMN_X, y: 125, r: 11 },

  // Left pinky cluster, fanned left near L3.
  lpGSharp: { x: 60, y: 110, r: 7 },
  lpCSharp: { x: 44, y: 128, r: 7 },
  lpB: { x: 44, y: 146, r: 7 },
  lpBb: { x: 60, y: 164, r: 7 },

  // Side keys, fanned right near the L3/R1 divider.
  sideC: { x: 150, y: 118, r: 7 },
  sideBb: { x: 150, y: 136, r: 7 },
  sideE: { x: 150, y: 154, r: 7 },
  frontF: { x: 150, y: 172, r: 7 },

  // Main right-hand column.
  R1: { x: COLUMN_X, y: 170, r: 11 },
  R2: { x: COLUMN_X, y: 205, r: 11 },
  R3: { x: COLUMN_X, y: 240, r: 11 },

  // Right pinky cluster, below R3.
  rpC: { x: 84, y: 262, r: 7 },
  rpEb: { x: 116, y: 262, r: 7 },
}

/** Divider between the left-hand and right-hand key groups, for a visual gap. */
export const DIVIDER_Y = 148
