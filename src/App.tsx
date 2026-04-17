import { useCallback, useEffect, useMemo, useState } from "react";
import { useVaultGraph } from "./useVaultGraph";
import { SkyCanvas } from "./SkyCanvas";
import { StarField } from "./StarField";
import { WeatherLayer } from "./WeatherLayer";
import { SkySeatToggle, SkySeatRitual } from "./SkySeat";
import { useSkySeat, type ViewMode } from "./useSkySeat";
import { useWeather } from "./useWeather";
import { useHubRegistry } from "./useHubRegistry";
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
  const { bindingFor } = useHubRegistry();
  const { settings, update, togglePin } = useSettings();
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  // Skip the AnteRoom entry gate when embedded (e.g. inside command-center's
  // workshop, which is already operator-authed). Detection: ?embedded=1 in the
  // URL, or running inside an iframe on a different parent origin.
  const isEmbedded =
    new URLSearchParams(window.location.search).get("embedded") === "1" ||
    (window.self !== window.top);
  const [entered, setEntered] = useState(isEmbedded);
  const [journalOpen, setJournalOpen] = useState(false);
  // Lifted zoom transform so sibling layers (WeatherLayer) can mirror
  // the star sky's pan/zoom and stay anchored to their pillar sectors.
  const [skyTransform, setSkyTransform] = useState<{ x: number; y: number; k: number }>({
    x: 0,
    y: 0,
    k: 1,
  });

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

  // Gap 6 — visibility gate. Standalone Cielo (public URL) filters
  // visibility:private hubs (typically type:person) out of both nodes and
  // edges. Embedded Cielo inherits the parent's auth gate and shows
  // everything.
  const visibleGraph = (() => {
    if (isEmbedded) return graph;
    const hidden = new Set<string>();
    for (const n of graph.nodes) {
      if (bindingFor(n.id).visibility === "private") hidden.add(n.id);
    }
    if (hidden.size === 0) return graph;
    return {
      ...graph,
      nodes: graph.nodes.filter((n) => !hidden.has(n.id)),
      edges: graph.edges.filter((e) => !hidden.has(e.source) && !hidden.has(e.target)),
    };
  })();

  return (
    <>
      {/* Starfield hidden in daylight mode — there are no visible stars at noon. */}
      {settings.theme !== "daylight" && <StarField reduceMotion={reduceMotion} />}
      <SkyCanvas
        graph={visibleGraph}
        view={view}
        settings={settings}
        onTogglePin={togglePin}
        onTransformChange={setSkyTransform}
        bindingFor={bindingFor}
      />
      <WeatherLayer
        cells={cells}
        opacity={weatherOpacity}
        width={size.w}
        height={size.h}
        reduceMotion={reduceMotion}
        transform={skyTransform}
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
