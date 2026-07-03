# Saxophone Practice Trainer — Design Doc

## 1. Overview

This is a browser-based practice tool for saxophone that listens through the device microphone, detects the pitch being played, and gives real-time feedback on note accuracy and intonation. Its core pedagogical goal is not just "am I in tune" but **building fingering-to-sound muscle memory**: the player sees or hears a target note, plays it from memory, and only afterward (on a configurable delay) sees the fingering or sheet notation as confirmation or correction.

The product is a single-page web app, works on desktop and mobile browsers, and requires no account, backend audio processing, or install. All audio analysis runs client-side for latency and privacy reasons (raw audio never needs to leave the device).

The primary use case is solo practice: scale drills and random-note drills where the delayed-reveal mechanic is the main lever for shifting the player from "read fingering → play" to "hear/see note name → recall fingering → play," which is the actual skill of playing by ear/reading.

## 2. Features

### POC (v01)
- Basic web page with mic permission request
- Detected note in middle of screen, updated in real time as the user plays
- Mic capture + real-time pitch detection (frequency → note name)
- Display of detected note and fingering chart (always on, no delay)
- Folder for finger chart image files by note name + instrument (alto/tenor/soprano/bari) "tenor_sax-A4.svg", "tenor_sax-Bb3.png"
- Single instrument selection (tenor sax) with frequency-to-note mapping for that instrument

### MVP (v1)
- Mic capture + real-time pitch detection (frequency → note name + cents deviation)
- Needle/meter widget showing tuning accuracy (flat/sharp, in cents)
- Note detection display: shows the note currently being heard
- Scale mode: walks through a selected scale (e.g., Bb concert major on alto), advances automatically when the correct note is held in tune for a short duration
- Fingering chart display, with a configurable reveal delay (0s = always on, 1–3s = delayed, off = never shown)
- Basic session settings: instrument transposition (Eb alto/bari vs Bb tenor/soprano vs concert C), note range, tempo/hold-time for "correct" registration, fingering delay
- See all notes and fingers page
- Scales selection page. See all scales notes and fingering. Click to start a drill with that scale

### v1.5 / stretch
- Tone-quality indicator (secondary to pitch: stability/steadiness over the hold, not a full timbre grade)
- Practice history: which notes/scales are consistently late or wrong
- Sheet-note (single note on a mini staff) display, same delay option, independent of fingering delay
- Random-note mode: flashes a target note, advances on correct match
- Randomized "flash then hide" mode: note flashes for a fixed time and disappears before you play, forcing pure recall
- Custom scale/interval builder (e.g., practice thirds, arpeggios, chromatic runs)
- Adjustable "in tune" tolerance (cents window) for progressive difficulty
- Audio recording of last N seconds for self-review

### Explicitly out of scope for v1
- Multi-instrument/polyphonic detection (sax is monophonic, which simplifies detection significantly — no need to solve that harder problem)
- Grading full pieces or sight-reading a real score
- Any server-side storage/accounts (v1 is fully local; add later if history/sync is wanted)

## 3. Design Choices & Tradeoffs

**Client-side only audio processing.**
Running pitch detection in the browser (vs. streaming audio to a server) avoids network latency, which matters a lot for a "played a note → see feedback" loop. Tradeoff: constrains us to algorithms cheap enough to run on a phone browser every 20–50ms (autocorrelation/McLeod-family, not neural pitch trackers like CREPE, which are more accurate but too heavy for real-time in-browser use).

**McLeod Pitch Method (via Pitchy) over YIN as primary algorithm.**
McLeod tends to be more robust at low frequencies, which matters because sax's low register (down to Bb3, ~117 Hz on alto concert pitch) is exactly where naive autocorrelation/YIN can produce octave errors. Tradeoff: slightly more compute per frame than plain autocorrelation, but negligible on modern hardware.

**Delayed reveal as the core learning mechanic, not an afterthought.**
The fingering chart and sheet note are deliberately treated as "answer key" UI, not primary UI. Default state for a practicing (non-beginner) user should be delay-on. This is a design stance, not just a feature toggle — the empty/blank state before reveal needs to feel intentional (e.g., a subtle placeholder or countdown ring) rather than like a loading bug. Tradeoff: could frustrate true beginners who have no fingering memorized yet, so beginners need an explicit "always show" mode rather than being forced into delay.

**Note-hold-to-advance, not attack-to-advance.**
Advancing a drill only when the pitch has been correct and stable for e.g. 300–500ms (not on first onset) avoids false-advances from note attacks/pitch bending on entry, which is common on reed instruments as the embouchure settles. Tradeoff: adds a small perceptible delay before advancing, but is more forgiving and realistic than expecting instant on-pitch attacks.

**Cents-based tolerance, adjustable.**
Rather than a binary right/wrong, feedback is continuous (needle position in cents) with a separate, adjustable "counts as correct" threshold (e.g., ±15 cents for advancing). This lets the same tool serve beginners (wide tolerance) and advanced players tightening intonation (narrow tolerance) without separate modes.

**Single note/monophonic assumption.**
Saxophone is physically monophonic, so we don't need polyphonic pitch detection (a much harder, less mature problem). This meaningfully bounds the audio engineering problem and is worth stating explicitly as a design constraint that keeps this project tractable.

**Transposition handled as a display-layer concern, not a detection-layer concern.**
Pitch detection always works in concert pitch (actual Hz). Transposition (Eb alto vs Bb tenor vs concert) is applied only when mapping detected pitch to displayed note name and fingering chart lookup. This keeps the audio pipeline instrument-agnostic and the transposition logic isolated and easily testable.

## 4. User Journeys & Flows

**Journey A — First-time setup**
1. User opens the page, grants mic permission.
2. Quick setup: select instrument (alto/tenor/soprano/bari), skill level (affects default delay settings and tolerance), and note range (or "auto-detect from a few played notes").
3. Lands on a home/practice-mode picker screen.

**Journey B — Scale drill practice (primary loop)**
1. User picks a scale (e.g., "F major, alto") and delay settings (fingering: 1s delay, sheet note: off).
2. App shows the target note name only (large, centered) — no fingering, no staff.
3. User plays the note.
4. Live needle shows cents-off in real time as they hold the note.
5. If held in-tune tolerance for the hold-duration threshold: green confirmation flash, fingering chart reveals per the delay setting (as a "were you right" check), then auto-advances to the next scale note after a short pause.
6. If wrong note or badly out of tune after a timeout: fingering chart reveals early as a hint, note stays as target until corrected.
7. At the end of the scale, a short summary: which notes took longest / needed the hint reveal.

**Journey C — Random-note drill (recall-focused)**
1. Same as B, but notes are drawn randomly from the selected range instead of in scale order — removes the ability to "guess" the next note from scale memory, isolating pure note-recall.
2. Optional "flash and hide": target note is shown for e.g. 1.5s then disappears, so the player must recall it before playing (like a memory drill), rather than reading it while playing.

**Journey D — Free tuning mode**
1. No target note; just live needle + detected note name, for warm-ups or long-tone practice. Simplest flow, no drill state machine involved.

**Flow diagram (state machine, textual)**
```
[Idle] --mic granted--> [Listening]
[Listening] --drill started--> [AwaitingNote]
[AwaitingNote] --pitch stable & correct--> [Confirmed] --delay elapsed--> [RevealAnswer] --pause--> [AwaitingNote: next]
[AwaitingNote] --pitch stable & wrong, timeout exceeded--> [HintReveal] --> [AwaitingNote: same note]
[AwaitingNote] --user skips/pauses--> [Paused] --resume--> [AwaitingNote]
[Drill complete] --> [SessionSummary]
```

## 5. Technical & Architecture

**Stack**
- Frontend: TypeScript, framework-agnostic core (a plain state machine + Web Audio, wrapped in a light UI layer — React is fine if the app grows, but not required for MVP)
- Audio: Web Audio API (`AudioContext`, `AudioWorkletNode` for pulling PCM frames off the main thread — avoid the deprecated `ScriptProcessorNode`)
- Pitch detection: **Pitchy** (McLeod Pitch Method) as primary; keep an adapter interface so YIN (via Pitchfinder) can be swapped in for comparison/testing
- Notation rendering: **VexFlow** for the single-note staff display
- Fingering charts: static SVG per note, keyed by note name + instrument, with simple show/hide + fade

**High-level module breakdown**
```
/audio
  captureWorklet.ts     — mic → AudioWorklet → Float32 frames
  pitchDetector.ts       — wraps Pitchy, exposes detectPitch(frame) -> {hz, clarity}
  noteMapper.ts           — hz -> {noteName, octave, cents} in concert pitch
  transposition.ts        — concert pitch <-> instrument-displayed note name

/drill
  drillStateMachine.ts    — Idle/AwaitingNote/Confirmed/HintReveal/etc (pure, testable, no DOM/audio deps)
  scaleGenerator.ts       — given scale + range -> ordered note sequence
  randomNoteGenerator.ts  — given range + constraints -> note sequence

/ui
  NeedleMeter.tsx
  NoteFlashcard.tsx
  FingeringChart.tsx (delay-aware)
  SheetNote.tsx (delay-aware, VexFlow wrapper)
  SessionSummary.tsx

/config
  instruments.ts          — transposition intervals, ranges per instrument
  fingeringData.ts         — note -> fingering diagram mapping
```

**Key interfaces (sketch)**
```ts
interface PitchReading {
  hz: number;
  clarity: number;   // 0-1 confidence from Pitchy
  timestamp: number;
}

interface NoteReading {
  noteName: string;    // e.g. "F#4", in concert pitch
  cents: number;        // deviation from nearest note, -50..+50
  clarity: number;
}

interface DrillState {
  targetNote: string;
  phase: 'awaiting' | 'confirmed' | 'hint' | 'paused';
  holdStartedAt: number | null;
  attemptsOnCurrentNote: number;
}
```

**Data flow**
```
mic → AudioWorklet (float32 frames)
    → pitchDetector.detectPitch()  → PitchReading
    → noteMapper.toNote()          → NoteReading (concert pitch)
    → transposition.forDisplay()   → displayed note name for the chosen instrument
    → drillStateMachine.update()   → DrillState
    → UI components render off DrillState + NoteReading
```

Decoupling the state machine from audio/DOM is deliberate: it means drill logic (advance conditions, delay timers, hint logic) can be fully unit tested with synthetic `NoteReading` sequences, with no mic or browser needed.

**Latency/window tradeoff**
Analysis window sized for the lowest note in range (sax down to ~117 Hz on alto low Bb needs at least ~2–3 periods, ~20–25ms, to resolve reliably) — buffer size chosen accordingly (e.g., 2048–4096 samples at 44.1kHz), balanced against wanting sub-50ms perceived feedback latency.

## 6. Test Planning (TDD-style)

Tests are organized so the pure/testable core (note math, transposition, drill state machine) gets fast unit tests with no audio dependency, and only a thin layer at the edges needs manual/integration testing.

**Unit tests — write first, before implementation**

`noteMapper`
- Given exact A4 (440Hz) → returns {noteName: "A4", cents: 0}
- Given 445Hz → returns cents deviation ≈ +19.5 cents, correct note name
- Given frequency exactly between two notes → resolves to nearer one, cents near ±50
- Given very low clarity/confidence reading → returns "no reading" rather than a guessed note (avoid flickering false readings)

`transposition`
- Concert C4, alto sax (Eb) → displays as "A4" (alto reads a major sixth above concert)
- Concert C4, tenor sax (Bb) → displays as "D5"
- Round-trip: displayed note + instrument → back to correct concert pitch for fingering chart lookup

`scaleGenerator`
- Given "F major" + range Bb3–F5 → produces correct ascending note sequence, no notes outside range
- Given a scale that doesn't fit cleanly in range → clips correctly at both ends, doesn't crash or produce partial garbage

`drillStateMachine` (the highest-value test surface — pure logic, no I/O)
- Correct pitch held for < hold-threshold → stays in `awaiting`
- Correct pitch held for ≥ hold-threshold → transitions to `confirmed`
- Wrong pitch, under timeout → stays in `awaiting`, no hint yet
- Wrong pitch past timeout → transitions to `hint`
- `confirmed` + delay elapsed → transitions to `reveal` → then next note after pause
- Delay = 0 → reveal is immediate (regression guard for the "always show" beginner mode)
- Rapid pitch fluctuation around the correct note (simulating natural pitch wobble) doesn't reset the hold timer if within tolerance band — this is the test that most directly encodes "don't punish natural micro-variation"
- Sequence exhaustion → transitions to `sessionComplete`, not an error state

**Integration-level tests (still automatable, feed synthetic audio)**
- Feed a pre-recorded/synthesized sine sweep through the real `pitchDetector` → assert detected note names track expected values within tolerance across the full playable range (this is where we validate Pitchy's real behavior on our chosen buffer size, not just mocked math)
- Feed a synthesized note with the fundamental suppressed (harmonic-heavy but weak fundamental, mimicking a bright reed tone) → assert no octave error (this directly tests the McLeod-vs-YIN choice; a candidate regression here would justify swapping algorithms)
- Feed silence / room noise only → assert no false note reading, no drill advance

**Manual / device testing (can't be fully automated)**
- Real mic latency perceived end-to-end on a mid-range phone browser (Safari iOS + Chrome Android, both have quirks with `AudioContext` autoplay/permission flows)
- Actual saxophone low-register octave-error check (synthesized sine sweeps don't fully capture real reed harmonic content)
- Delay-reveal "feel" — is 1s the right default, does the placeholder state read as intentional rather than broken — this is a UX judgment call to validate with a few real practice sessions, not a pass/fail test

**Explicit non-goals for testing**
- No attempt to unit-test subjective "tone quality" scoring in v1, since it isn't in MVP scope — if added in v1.5, treat it the same way (pure scoring function fed synthetic spectral data, tested in isolation from audio capture).