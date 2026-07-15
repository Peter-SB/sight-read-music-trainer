import type { KeyId } from '../config/keys'

/**
 * Asset-based fingering diagram layout, built from a scraped commercial
 * fingering-chart tool's image set (see `sample_js_finger_diagram_code.js`
 * for the original render logic this was reverse-engineered from).
 *
 * The tool draws one base outline image showing every key as an unfilled
 * shape, then stacks small highlight images on top — one per auxiliary key,
 * each already positioned correctly within the same pixel canvas, so they
 * can be overlaid at 0,0 with no per-key offset math. The tool's six main
 * column keys (L1–L3/R1–R3) and its three palm keys aren't images at all —
 * it draws plain filled circles for those directly onto the canvas, so we
 * do the same, using coordinates read off the base outline art.
 *
 * The tool's per-note "which buttons light up" table doesn't share our
 * {@link KeyId} vocabulary, so the button→key mapping below was inferred by
 * diffing which button indices toggle between adjacent chromatic notes in
 * that table and matching the deltas to known real fingerings (e.g. C4 vs
 * Db4 differ by exactly the low-C♯ pinky lever). The button↔image
 * correspondence itself comes straight from the source (each button object
 * names its own image file); the physical-key identity of each button is
 * the inferred part.
 *
 * - Octave key, the four pinky-cluster keys, and the two right-pinky keys:
 *   derived from clean low-register deltas (Bb3→B3→C4→Db4→D4, Ab4, Bb4→
 *   Eb4) with no altissimo ambiguity — solid.
 * - sideC and sideBb: derived from the altissimo run D6→E6→F6→F#6 (E6 adds
 *   button 9 and keeps it through F6/F#6/C#7/D7 — the only button that's
 *   stable across that whole run, matching side C's role as a common
 *   altissimo-assist key; F#6 additionally adds button 6, matching side Bb
 *   commonly being added a semitone up for stability) and cross-checked against
 *   this app's own {@link ../config/fingeringMap} table, which uses sideC
 *   for Db5 and sideBb for Bb5 — both render correctly with this mapping.
 * - sideE and frontF: derived from G6 vs G♯6 differing only by swapping
 *   button 7 for button 8 (a documented altissimo alternate-fingering
 *   pattern), assigned front F to G6 and side E to G♯6/B6 per standard
 *   altissimo charts. Neither key appears in this app's own fingering
 *   table, so unlike sideC/sideBb this pairing couldn't be cross-checked
 *   against known-correct output — treat it as best-effort.
 * - The "extra" image (button 5) never appears in the source note table at
 *   all, for any note, and doesn't correspond to any key in {@link KeyId}.
 *   Left deliberately unmapped rather than guessed.
 *
 * The six main column keys and three palm keys aren't images in the source
 * tool at all — it draws plain filled circles for those directly onto the
 * canvas, so we do the same, using coordinates read off the base outline art.
 */

const IMAGE_ROOT = `${import.meta.env.BASE_URL}fingerings/saxaphone/fingering-parts-images`

/** Pixel size of the base image and every highlight overlay (they're designed to stack exactly). */
export const DIAGRAM_CANVAS = { width: 200, height: 520 }

/** Width/height ratio shared by the base image and every highlight overlay; the diagram must preserve it rather than stretch to fill its container. */
export const IMAGE_ASPECT_RATIO = DIAGRAM_CANVAS.width / DIAGRAM_CANVAS.height

/** The base outline, drawn under everything else. Same pixel canvas as every highlight image. */
export const DIAGRAM_BASE_IMAGE = `${IMAGE_ROOT}/saxophone-additional-section.jpg`

/** Highlight overlay image for keys the source tool renders as a bespoke image rather than a circle. */
export const KEY_IMAGES: Partial<Record<KeyId, string>> = {
  octave: `${IMAGE_ROOT}/chart-octave-key.png`,
  lpGSharp: `${IMAGE_ROOT}/chart-left-hand-l4.png`,
  lpB: `${IMAGE_ROOT}/chart-left-hand-l5.png`,
  lpCSharp: `${IMAGE_ROOT}/chart-left-hand-l6.png`,
  lpBb: `${IMAGE_ROOT}/chart-left-hand-l7.png`,
  sideBb: `${IMAGE_ROOT}/chart-right-hand-r4.png`,
  frontF: `${IMAGE_ROOT}/chart-right-hand-r3.png`,
  sideE: `${IMAGE_ROOT}/chart-right-hand-r2.png`,
  sideC: `${IMAGE_ROOT}/chart-right-hand-r1.png`,
  rpEb: `${IMAGE_ROOT}/chart-right-hand-r5.png`,
  rpC: `${IMAGE_ROOT}/chart-right-hand-r6.png`,
}

/** Source image with no matching {@link KeyId} — never referenced, kept only for documentation. */
export const UNUSED_KEY_IMAGE = `${IMAGE_ROOT}/chart-right-hand-extra.png`

/**
 * Coordinates (in {@link DIAGRAM_CANVAS} pixel space) for keys with no highlight
 * image, read off the base outline art's own unfilled circles.
 */
export const CIRCLE_KEY_POSITIONS: Partial<Record<KeyId, { x: number; y: number; r: number }>> = {
  L1: { x: 92, y: 80, r: 26.5 },
  L2: { x: 92, y: 144, r: 26.5 },
  L3: { x: 92, y: 208, r: 26.5 },
  R1: { x: 92, y: 288, r: 26.5 },
  R2: { x: 92, y: 352, r: 26.5 },
  R3: { x: 92, y: 416, r: 26.5 },
  palmD: { x: 158, y: 80, r: 9 },
  palmEb: { x: 142, y: 60, r: 9 },
  palmF: { x: 142, y: 100, r: 9 },
}
