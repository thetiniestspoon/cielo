import { useCallback, useEffect, useMemo, useState } from "react";
import { useVaultGraph } from "./useVaultGraph";
import { SkyCanvas } from "./SkyCanvas";
import { StarField } from "./StarField";
import { WeatherLayer } from "./WeatherLayer";
import { SkySeatToggle, SkySeatRitual } from "./SkySeat";
import { useSkySeat, type ViewMode } from "./useSkySeat";
import { useWeather } from "./useWeather";
import { useSettings, isMotionReduced } from "./settings";
import { StatusLine } from "./StatusLine";
import { SettingsPanel } from "./SettingsPanel";
import { AnteRoom } from "./AnteRoom";
import { DiffPill } from "./DiffPill";
import { JournalPanel, JournalButton } from "./JournalPanel";
import { COLORS } from "./celestial";

const CYCLE_ORDER: ViewMode[] = ["stars", "both", "weather"];

function App() {
  const { graph, error, syncedAt, diff, clearDiff } = useVaultGraph();
  const { view, requestView, ritualOpen, pendingView, completeRitual, cancelRitual } = useSkySeat();
  const { cells } = useWeather();
  const { settings, update, togglePin } = useSettings();
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [entered, setEntered] = useState(false);
  const [journalOpen, setJournalOpen] = useState(false);

  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const reduceMotion = useMemo(() => isMotionReduced(settings), [settings]);

  // Apply theme attribute to <body> so CSS can swap the backdrop.
  useEffect(() => {
    document.body.dataset.theme = settings.theme;
    return () => {
      delete document.body.dataset.theme;
    };
  }, [settings.theme]);

  const onCycle = useCallback(() => {
    const idx = CYCLE_ORDER.indexOf(view);
    const next = CYCLE_ORDER[(idx + 1) % CYCLE_ORDER.length];
    requestView(next);
  }, [view, requestView]);

  if (error) {
    return (
      <div
        style={{
          width: "100vw",
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: COLORS.deepSky,
          color: COLORS.softCream,
          fontFamily: "'Nunito', system-ui, sans-serif",
        }}
      >
        <p>Failed to load vault: {error}</p>
      </div>
    );
  }

  if (!graph) {
    return (
      <div
        style={{
          width: "100vw",
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: COLORS.deepSky,
        }}
      >
        <div className="sky-shimmer" />
      </div>
    );
  }

  const weatherOpacity = view === "weather" ? 0.9 : view === "both" ? 0.55 : 0;
  const showAnteRoom = settings.anteRoomEnabled && !entered;

  return (
    <>
      {/* Starfield hidden in daylight mode — there are no visible stars at noon. */}
      {settings.theme !== "daylight" && <StarField reduceMotion={reduceMotion} />}
      <SkyCanvas
        graph={graph}
        view={view}
        settings={settings}
        onTogglePin={togglePin}
      />
      <WeatherLayer
        cells={cells}
        opacity={weatherOpacity}
        width={size.w}
        height={size.h}
        reduceMotion={reduceMotion}
      />
      <SkySeatToggle view={view} onRequestView={requestView} onCycle={onCycle} />
      <StatusLine
        view={view}
        cells={cells}
        vaultSyncedAt={syncedAt}
        nodeCount={graph.nodes.length}
      />
      {diff && <DiffPill diff={diff} onDismiss={clearDiff} />}
      <SkySeatRitual
        open={ritualOpen}
        pendingView={pendingView}
        prompt={settings.ritualPrompt}
        breathPattern={settings.ritualBreathPattern}
        silent={settings.ritualSilent}
        reduceMotion={reduceMotion}
        onComplete={completeRitual}
        onSkip={cancelRitual}
      />
      <JournalButton onClick={() => setJournalOpen(true)} />
      <JournalPanel open={journalOpen} onClose={() => setJournalOpen(false)} />
      <SettingsPanel
        settings={settings}
        onUpdate={update}
        pinnedLabels={settings.pinnedNodes}
        onUnpin={togglePin}
      />
      {showAnteRoom && (
        <AnteRoom
          nodeCount={graph.nodes.length}
          syncedAt={syncedAt}
          onEnter={() => setEntered(true)}
        />
      )}
    </>
  );
}

export default App;
