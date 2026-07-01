import { useState } from 'react'
import { useAudioPitch } from './ui/useAudioPitch'
import { NoteDisplay } from './ui/NoteDisplay'
import { FingeringChart } from './ui/FingeringChart'
import { InstrumentSelector } from './ui/InstrumentSelector'
import { DEFAULT_INSTRUMENT, type InstrumentId } from './config/instruments'
import './App.css'

function App() {
  const [instrument, setInstrument] = useState<InstrumentId>(DEFAULT_INSTRUMENT)
  const { status, error, note, start, stop } = useAudioPitch()

  const running = status === 'running'
  const requesting = status === 'requesting'

  const toggle = () => {
    if (running) stop()
    else void start()
  }

  return (
    <main className="app">
      <header className="app__header">
        <h1>Sax Practice Trainer</h1>
        <p className="app__tagline">
          Play a note — see what you're playing, in tune, with the fingering.
        </p>
      </header>

      <section className="controls">
        <InstrumentSelector value={instrument} onChange={setInstrument} />
        <button
          type="button"
          className={`mic-button ${running ? 'mic-button--stop' : ''}`}
          onClick={toggle}
          disabled={requesting}
        >
          {running
            ? 'Stop'
            : requesting
              ? 'Requesting mic…'
              : 'Start listening'}
        </button>
      </section>

      {error && (
        <div className="banner banner--error" role="alert">
          Microphone unavailable: {error.message}
        </div>
      )}

      <section className="stage">
        <NoteDisplay note={note} instrument={instrument} listening={running} />
        <FingeringChart
          concertNoteName={note?.noteName ?? null}
          instrument={instrument}
        />
      </section>

      <footer className="app__footer">
        <span className={`status-dot status-dot--${status}`} aria-hidden="true" />
        {statusLabel(status)}
      </footer>
    </main>
  )
}

function statusLabel(status: string): string {
  switch (status) {
    case 'running':
      return 'Listening'
    case 'requesting':
      return 'Requesting microphone access…'
    case 'error':
      return 'Microphone error'
    default:
      return 'Idle — start listening to begin'
  }
}

export default App
