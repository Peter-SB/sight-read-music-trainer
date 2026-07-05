import { useEffect, useRef, useState } from "react";
import { useAudioPitch } from "./ui/useAudioPitch";
import { calibratedA4Hz, formatNoteNameForDisplay } from "./audio/noteMapper";
import { forDisplay } from "./audio/transposition";
import { NoteDisplay } from "./ui/NoteDisplay";
import { FingeringDiagram } from "./ui/FingeringDiagram";
import { NeedleMeter } from "./ui/NeedleMeter";
import { AccuracyBar } from "./ui/AccuracyBar";
import { TuningSlider } from "./ui/TuningSlider";
import { ScalesPage } from "./ui/ScalesPage";
import { AllNotesPage } from "./ui/AllNotesPage";
import { SettingsPanel } from "./ui/SettingsPanel";
import { ScaleDrillView } from "./ui/ScaleDrillView";
import { CalibrationView } from "./ui/CalibrationView";
import { INSTRUMENTS } from "./config/instruments";
import { DEFAULT_SETTINGS, fingeringRevealToMs } from "./config/settings";
import { loadSettings, saveSettings } from "./config/settingsStorage";
import type { ScaleId } from "./config/scales";
import "./App.css";

type Screen =
  | "home"
  | "scales"
  | "allNotes"
  | "settings"
  | "drill"
  | "calibrate";

function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [settings, setSettings] = useState(loadSettings);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);
  const [drillScale, setDrillScale] = useState<{
    scaleId: ScaleId;
    root: string;
    rangeLow: string;
    rangeHigh: string;
    randomOrder: boolean;
  }>({
    scaleId: settings.lastScaleId,
    root: settings.lastScaleRoot,
    rangeLow: settings.lastScaleRangeLow,
    rangeHigh: settings.lastScaleRangeHigh,
    randomOrder: false,
  });

  if (screen === "scales") {
    return (
      <main className="app">
        <ScalesPage
          instrument={settings.instrument}
          scaleId={settings.lastScaleId}
          root={settings.lastScaleRoot}
          keyMode={settings.lastScaleKeyMode}
          rangeLow={settings.lastScaleRangeLow}
          rangeHigh={settings.lastScaleRangeHigh}
          onScaleIdChange={(lastScaleId) =>
            setSettings({ ...settings, lastScaleId })
          }
          onRootChange={(lastScaleRoot) =>
            setSettings({ ...settings, lastScaleRoot })
          }
          onKeyModeChange={(lastScaleKeyMode) =>
            setSettings({ ...settings, lastScaleKeyMode })
          }
          onRangeLowChange={(lastScaleRangeLow) =>
            setSettings({ ...settings, lastScaleRangeLow })
          }
          onRangeHighChange={(lastScaleRangeHigh) =>
            setSettings({ ...settings, lastScaleRangeHigh })
          }
          onBack={() => setScreen("home")}
          onStartDrill={(scaleId, root, rangeLow, rangeHigh, randomOrder) => {
            setDrillScale({ scaleId, root, rangeLow, rangeHigh, randomOrder });
            setScreen("drill");
          }}
        />
      </main>
    );
  }

  if (screen === "allNotes") {
    return (
      <main className="app">
        <AllNotesPage
          instrument={settings.instrument}
          rangeLow={settings.rangeLow}
          rangeHigh={settings.rangeHigh}
          onBack={() => setScreen("home")}
        />
      </main>
    );
  }

  if (screen === "settings") {
    return (
      <main className="app">
        <SettingsPanel
          settings={settings}
          onChange={setSettings}
          onBack={() => setScreen("home")}
        />
      </main>
    );
  }

  if (screen === "calibrate") {
    return (
      <main className="app">
        <CalibrationView
          instrument={settings.instrument}
          currentOffsetCents={settings.tuningOffsetCents}
          onApply={(tuningOffsetCents) =>
            setSettings({ ...settings, tuningOffsetCents })
          }
          onBack={() => setScreen("home")}
        />
      </main>
    );
  }

  if (screen === "drill") {
    return (
      <main className="app">
        <ScaleDrillView
          instrument={settings.instrument}
          scaleId={drillScale.scaleId}
          rootPitchClass={drillScale.root}
          rangeLow={drillScale.rangeLow}
          rangeHigh={drillScale.rangeHigh}
          randomOrder={drillScale.randomOrder}
          adaptiveWeight={settings.adaptiveWeight}
          holdMs={settings.holdMs}
          acceptanceThresholdCents={settings.acceptanceThresholdCents}
          fingeringReveal={settings.fingeringReveal}
          tuningOffsetCents={settings.tuningOffsetCents}
          onTuningOffsetChange={(tuningOffsetCents) =>
            setSettings({ ...settings, tuningOffsetCents })
          }
          onExit={() => setScreen("home")}
        />
      </main>
    );
  }

  return (
    <HomeScreen
      settings={settings}
      onSettingsChange={setSettings}
      onNavigate={setScreen}
    />
  );
}

function HomeScreen({
  settings,
  onSettingsChange,
  onNavigate,
}: {
  settings: typeof DEFAULT_SETTINGS;
  onSettingsChange: (next: typeof DEFAULT_SETTINGS) => void;
  onNavigate: (screen: Screen) => void;
}) {
  const { status, error, note, start, stop } = useAudioPitch(
    calibratedA4Hz(settings.tuningOffsetCents),
  );

  const running = status === "running";
  const requesting = status === "requesting";

  const toggle = () => {
    if (running) stop();
    else void start();
  };

  // Reveal the fingering chart only after the configured delay since this note started sounding.
  const [revealedNote, setRevealedNote] = useState<string | null>(null);
  const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (revealTimer.current) {
      clearTimeout(revealTimer.current);
      revealTimer.current = null;
    }

    const noteName = note?.noteName ?? null;
    if (!noteName || settings.fingeringReveal === "off") {
      setRevealedNote(null);
      return;
    }

    const delayMs = fingeringRevealToMs(settings.fingeringReveal);
    if (delayMs <= 0) {
      setRevealedNote(noteName);
      return;
    }

    setRevealedNote(null);
    revealTimer.current = setTimeout(() => setRevealedNote(noteName), delayMs);
    return () => {
      if (revealTimer.current) clearTimeout(revealTimer.current);
    };
  }, [note?.noteName, settings.fingeringReveal]);

  return (
    <main className="app">
      <header className="app__header">
        <h1>Sax Practice Trainer</h1>
        <p className="app__tagline">
          Play a note — see what you're playing, in tune, with the fingering.
        </p>
      </header>

      <nav className="home-nav">
        <button type="button" onClick={() => onNavigate("scales")}>
          Scale drills
        </button>
        <button type="button" onClick={() => onNavigate("allNotes")}>
          All notes &amp; fingerings
        </button>
        <button type="button" onClick={() => onNavigate("calibrate")}>
          Calibrate mic
        </button>
        <button type="button" onClick={() => onNavigate("settings")}>
          Settings
        </button>
      </nav>

      <section className="controls">
        <div className="instrument-selector">
          <span className="instrument-selector__label">Instrument</span>
          <button
            type="button"
            className="link-button"
            onClick={() => onNavigate("settings")}
          >
            {INSTRUMENTS[settings.instrument].label}
          </button>
        </div>
        <button
          type="button"
          className={`mic-button ${running ? "mic-button--stop" : ""}`}
          onClick={toggle}
          disabled={requesting}
        >
          {running
            ? "Stop"
            : requesting
              ? "Requesting mic…"
              : "Start listening"}
        </button>
      </section>

      {error && (
        <div className="banner banner--error" role="alert">
          Microphone unavailable: {error.message}
        </div>
      )}

      <section className="stage">
        <NoteDisplay
          note={note}
          instrument={settings.instrument}
          listening={running}
        />
        <FingeringDiagram
          concertNoteName={revealedNote}
          instrument={settings.instrument}
        />
      </section>

      <NeedleMeter
        cents={note?.cents ?? null}
        noteName={
          note
            ? formatNoteNameForDisplay(
                forDisplay(note, settings.instrument).noteName,
              )
            : null
        }
        toleranceCents={settings.acceptanceThresholdCents}
      />
      <AccuracyBar
        cents={note?.cents ?? null}
        toleranceCents={settings.acceptanceThresholdCents}
      />
      <div className="tuning-row">
        <TuningSlider
          valueCents={settings.tuningOffsetCents}
          onChange={(tuningOffsetCents) =>
            onSettingsChange({ ...settings, tuningOffsetCents })
          }
        />
        <button
          type="button"
          className="link-button"
          onClick={() => onNavigate("calibrate")}
        >
          Calibrate
        </button>
      </div>

      <footer className="app__footer">
        <span
          className={`status-dot status-dot--${status}`}
          aria-hidden="true"
        />
        {statusLabel(status)}
      </footer>
    </main>
  );
}

function statusLabel(status: string): string {
  switch (status) {
    case "running":
      return "Listening";
    case "requesting":
      return "Requesting microphone access…";
    case "error":
      return "Microphone error";
    default:
      return "Idle — start listening to begin";
  }
}

export default App;
