import { useEffect, useMemo, useState } from "react";
import { useVaultGraph } from "./useVaultGraph";
import { SkyCanvas } from "./SkyCanvas";
import { StarField } from "./StarField";
import { WeatherLayer } from "./WeatherLayer";
import { SkySeatToggle, SkySeatRitual } from "./SkySeat";
import { useSkySeat } from "./useSkySeat";
import { useWeather } from "./useWeather";
import { useSettings, isMotionReduced } from "./settings";
import { StatusLine } from "./StatusLine";
import { SettingsPanel } from "./SettingsPanel";
import { COLORS } from "./celestial";

function App() {
  const { graph, error, syncedAt } = useVaultGraph();
  const { view, requestView, ritualOpen, pendingView, completeRitual, cancelRitual } = useSkySeat();
  const { cells } = useWeather();
  const { settings, update, togglePin } = useSettings();
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });

  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const reduceMotion = useMemo(() => isMotionReduced(settings), [settings]);

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

  return (
    <>
      <StarField />
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
      <SkySeatToggle view={view} onRequestView={requestView} />
      <StatusLine
        view={view}
        cells={cells}
        vaultSyncedAt={syncedAt}
        nodeCount={graph.nodes.length}
      />
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
      <SettingsPanel
        settings={settings}
        onUpdate={update}
        pinnedLabels={settings.pinnedNodes}
        onUnpin={togglePin}
      />
    </>
  );
}

export default App;
