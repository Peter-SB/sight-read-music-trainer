import { useEffect, useRef, useState } from "react";
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";
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
import { LearnSheetMusicPage } from "./ui/LearnSheetMusicPage";
import { checkBackendHealth } from "./api/omrClient";
import { SettingsPanel } from "./ui/SettingsPanel";
import { ScaleDrillView } from "./ui/ScaleDrillView";
import { CalibrationView } from "./ui/CalibrationView";
import { Sidebar } from "./ui/Sidebar";
import { INSTRUMENTS } from "./config/instruments";
import { fingeringRevealToMs } from "./config/settings";
import type { SessionSettings } from "./config/settings";
import { loadSettings, saveSettings } from "./config/settingsStorage";
import type { ScaleId } from "./config/scales";
import "./App.css";

interface DrillScaleState {
  scaleId: ScaleId;
  root: string;
  rangeLow: string;
  rangeHigh: string;
  randomOrder: boolean;
}

function App() {
  const [settings, setSettings] = useState(loadSettings);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const [drillScale, setDrillScale] = useState<DrillScaleState>({
    scaleId: settings.lastScaleId,
    root: settings.lastScaleRoot,
    rangeLow: settings.lastScaleRangeLow,
    rangeHigh: settings.lastScaleRangeHigh,
    randomOrder: false,
  });

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route
          element={
            <Layout settings={settings} onSettingsChange={setSettings} />
          }
        >
          <Route
            index
            element={
              <HomeScreen settings={settings} onSettingsChange={setSettings} />
            }
          />
          <Route
            path="scales"
            element={
              <ScalesRoute
                settings={settings}
                onSettingsChange={setSettings}
                onStartDrill={setDrillScale}
              />
            }
          />
          <Route
            path="all-notes"
            element={<AllNotesRoute settings={settings} />}
          />
          <Route path="learn-sheet-music" element={<LearnSheetMusicRoute />} />
          <Route
            path="settings"
            element={
              <SettingsRoute
                settings={settings}
                onSettingsChange={setSettings}
              />
            }
          />
          <Route
            path="calibrate"
            element={
              <CalibrateRoute
                settings={settings}
                onSettingsChange={setSettings}
              />
            }
          />
          <Route
            path="drill"
            element={
              <DrillRoute
                settings={settings}
                onSettingsChange={setSettings}
                drillScale={drillScale}
              />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

function Layout({
  settings,
  onSettingsChange,
}: {
  settings: SessionSettings;
  onSettingsChange: (next: SessionSettings) => void;
}) {
  return (
    <div className="app-shell">
      <Sidebar settings={settings} onSettingsChange={onSettingsChange} />
      <div className="app-content">
        <Outlet />
      </div>
    </div>
  );
}

function ScalesRoute({
  settings,
  onSettingsChange,
  onStartDrill,
}: {
  settings: SessionSettings;
  onSettingsChange: (next: SessionSettings) => void;
  onStartDrill: (next: DrillScaleState) => void;
}) {
  const navigate = useNavigate();
  return (
    <ScalesPage
      instrument={settings.instrument}
      scaleId={settings.lastScaleId}
      root={settings.lastScaleRoot}
      keyMode={settings.lastScaleKeyMode}
      rangeLow={settings.lastScaleRangeLow}
      rangeHigh={settings.lastScaleRangeHigh}
      onScaleIdChange={(lastScaleId) =>
        onSettingsChange({ ...settings, lastScaleId })
      }
      onRootChange={(lastScaleRoot) =>
        onSettingsChange({ ...settings, lastScaleRoot })
      }
      onKeyModeChange={(lastScaleKeyMode) =>
        onSettingsChange({ ...settings, lastScaleKeyMode })
      }
      onRangeLowChange={(lastScaleRangeLow) =>
        onSettingsChange({ ...settings, lastScaleRangeLow })
      }
      onRangeHighChange={(lastScaleRangeHigh) =>
        onSettingsChange({ ...settings, lastScaleRangeHigh })
      }
      onBack={() => navigate("/")}
      onStartDrill={(scaleId, root, rangeLow, rangeHigh, randomOrder) => {
        onStartDrill({ scaleId, root, rangeLow, rangeHigh, randomOrder });
        navigate("/drill");
      }}
    />
  );
}

function AllNotesRoute({ settings }: { settings: SessionSettings }) {
  const navigate = useNavigate();
  return (
    <AllNotesPage
      instrument={settings.instrument}
      rangeLow={settings.rangeLow}
      rangeHigh={settings.rangeHigh}
      onBack={() => navigate("/")}
    />
  );
}

function LearnSheetMusicRoute() {
  const navigate = useNavigate();
  return <LearnSheetMusicPage onBack={() => navigate("/")} />;
}

function SettingsRoute({
  settings,
  onSettingsChange,
}: {
  settings: SessionSettings;
  onSettingsChange: (next: SessionSettings) => void;
}) {
  const navigate = useNavigate();
  return (
    <SettingsPanel
      settings={settings}
      onChange={onSettingsChange}
      onBack={() => navigate("/")}
    />
  );
}

function CalibrateRoute({
  settings,
  onSettingsChange,
}: {
  settings: SessionSettings;
  onSettingsChange: (next: SessionSettings) => void;
}) {
  const navigate = useNavigate();
  return (
    <CalibrationView
      instrument={settings.instrument}
      currentOffsetCents={settings.tuningOffsetCents}
      onApply={(tuningOffsetCents) =>
        onSettingsChange({ ...settings, tuningOffsetCents })
      }
      onBack={() => navigate("/")}
    />
  );
}

function DrillRoute({
  settings,
  onSettingsChange,
  drillScale,
}: {
  settings: SessionSettings;
  onSettingsChange: (next: SessionSettings) => void;
  drillScale: DrillScaleState;
}) {
  const navigate = useNavigate();
  return (
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
        onSettingsChange({ ...settings, tuningOffsetCents })
      }
      onExit={() => navigate("/")}
    />
  );
}

function HomeScreen({
  settings,
  onSettingsChange,
}: {
  settings: SessionSettings;
  onSettingsChange: (next: SessionSettings) => void;
}) {
  const navigate = useNavigate();
  const { status, error, note, start, stop } = useAudioPitch(
    calibratedA4Hz(settings.tuningOffsetCents),
  );

  const [sheetMusicBackendUp, setSheetMusicBackendUp] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void checkBackendHealth().then((up) => {
      if (!cancelled) setSheetMusicBackendUp(up);
    });
    return () => {
      cancelled = true;
    };
  }, []);

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

      {sheetMusicBackendUp && (
        <nav className="home-nav">
          <button type="button" onClick={() => navigate("/learn-sheet-music")}>
            Learn sheet music
          </button>
        </nav>
      )}

      <section className="controls">
        <div className="instrument-selector">
          <span className="instrument-selector__label">Instrument</span>
          <button
            type="button"
            className="link-button"
            onClick={() => navigate("/settings")}
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
          onClick={() => navigate("/calibrate")}
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
