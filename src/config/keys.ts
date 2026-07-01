/**
 * Physical key/lever definitions for a standard Boehm-system saxophone.
 *
 * These are the buttons a player's fingers actually press — not the tone pads
 * that end up closed (some levers, e.g. the low-Bb pinky key, mechanically
 * close other pads via linkage; we model what's pressed, not the linkage).
 */

export type Hand = 'left' | 'right'

export type KeyId =
  | 'octave'
  | 'L1'
  | 'L2'
  | 'L3'
  | 'R1'
  | 'R2'
  | 'R3'
  | 'lpGSharp'
  | 'lpCSharp'
  | 'lpB'
  | 'lpBb'
  | 'rpC'
  | 'rpEb'
  | 'sideC'
  | 'sideBb'
  | 'sideE'
  | 'frontF'
  | 'palmD'
  | 'palmEb'
  | 'palmF'

export interface KeyDefinition {
  id: KeyId
  /** Short human-facing label, e.g. for a diagram legend. */
  label: string
  hand: Hand
  /** Rough grouping for diagram layout. */
  group: 'main' | 'pinky' | 'side' | 'palm'
}

/** All physical keys, left hand then right hand, top (mouthpiece-end) to bottom. */
export const KEY_DEFINITIONS: Record<KeyId, KeyDefinition> = {
  octave: { id: 'octave', label: 'Octave', hand: 'left', group: 'main' },
  L1: { id: 'L1', label: 'Left 1', hand: 'left', group: 'main' },
  L2: { id: 'L2', label: 'Left 2', hand: 'left', group: 'main' },
  L3: { id: 'L3', label: 'Left 3', hand: 'left', group: 'main' },
  palmD: { id: 'palmD', label: 'Palm D', hand: 'left', group: 'palm' },
  palmEb: { id: 'palmEb', label: 'Palm E♭', hand: 'left', group: 'palm' },
  palmF: { id: 'palmF', label: 'Palm F', hand: 'left', group: 'palm' },
  lpGSharp: { id: 'lpGSharp', label: 'G♯', hand: 'left', group: 'pinky' },
  lpCSharp: { id: 'lpCSharp', label: 'Low C♯', hand: 'left', group: 'pinky' },
  lpB: { id: 'lpB', label: 'Low B', hand: 'left', group: 'pinky' },
  lpBb: { id: 'lpBb', label: 'Low B♭', hand: 'left', group: 'pinky' },
  R1: { id: 'R1', label: 'Right 1', hand: 'right', group: 'main' },
  R2: { id: 'R2', label: 'Right 2', hand: 'right', group: 'main' },
  R3: { id: 'R3', label: 'Right 3', hand: 'right', group: 'main' },
  sideC: { id: 'sideC', label: 'Side C', hand: 'right', group: 'side' },
  sideBb: { id: 'sideBb', label: 'Side B♭', hand: 'right', group: 'side' },
  sideE: { id: 'sideE', label: 'Side E', hand: 'right', group: 'side' },
  frontF: { id: 'frontF', label: 'Front F', hand: 'right', group: 'side' },
  rpC: { id: 'rpC', label: 'Low C', hand: 'right', group: 'pinky' },
  rpEb: { id: 'rpEb', label: 'Low E♭', hand: 'right', group: 'pinky' },
}

export const KEY_LIST: KeyDefinition[] = Object.values(KEY_DEFINITIONS)
