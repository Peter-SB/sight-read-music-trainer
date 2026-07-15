# Sight Read Music Trainer

Sight Reading Practice app. Practice you sight reading, instrument fingering, and scales with this web app with live audio processing. Play a note or select a scale and the app will display the note to play. The live audio processing will listen for the correct note and proceed once it registers. Practice your fingering, scales, and even tone/pitch.

This project is a quick and practical aplication of react, existing audio libraries, and ai tooling to solve a real need I had. It is not polished but works functionaly very well.

Some research and experiments have been done with OMR for uploading and processing sheetmusic however this is WIP and requires the backend to be hosted localy.

## Features

- **Live pitch listening.** The app listens through your microphone using real-time pitch detection ([pitchy](https://github.com/ianprime0509/pitchy)), and moves on to the next note once you've played the right one.
- **Note drills.** Random or ordered notes across your instrument's full written range. Adaptive note selection leans on the notes you're getting wrong more often.
- **Scale drills.** Major, Natural Minor, and Chromatic scales from any root, ascending across your instrument's range.
- **Fingering charts.** A fingering diagram sits next to each note so you can check your hand position while you play.
- **Tuning and pitch feedback.** A needle meter and cents display show how sharp or flat you are, and an accuracy bar tracks how a session is going.
- **Calibration.** Set your reference A4 (440Hz, 442Hz, whatever your band tunes to) so pitch detection matches your instrument.
- **Instrument support.** Tenor, Alto, Soprano, and Baritone Sax, with the written-to-concert-pitch transposition handled automatically.
- **Adjustable settings.** Set your practice range (lowest/highest note), fingering reveal timing, and adaptive difficulty weighting from the sidebar or the Settings page.
- **Sheet music upload (experimental).** A work-in-progress OMR pipeline that turns an uploaded sheet music PDF or image into a note sequence you can sight-read through the app. It needs the Python backend running locally (see below); the rest of the app works fine without it.

## Getting started

This project uses [pnpm](https://pnpm.io/).

```bash
pnpm install
pnpm dev
```

Then open the app in your browser and grant microphone access to start practicing.

Other useful scripts:

```bash
pnpm build   # type-check and build for production
pnpm test    # run the test suite
pnpm lint    # lint the codebase
```

## Optical Music Recognition backend (optional, WIP)

The "Learn sheet music" screen can transcribe an uploaded sheet music file into a sequence of notes using a local FastAPI + [oemer](https://github.com/BreezeWhite/oemer) backend. The rest of the app works fine without it: the frontend just shows a "backend unavailable" state and disables upload.

See [backend/README.md](backend/README.md) for setup instructions, including optional GPU acceleration.

## Tech stack

- React 19 + TypeScript, built with Vite
- react-router-dom for navigation
- Web Audio API + pitchy for live pitch detection
- Vitest for testing
- Python/FastAPI + oemer for the optional OMR backend
