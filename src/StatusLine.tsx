import { useEffect, useState } from "react";
import { COLORS } from "./celestial";
import type { ViewMode } from "./useSkySeat";
import type { WeatherCell } from "./useWeather";
import { Z } from "./z";

interface Props {
  view: ViewMode;
  cells: WeatherCell[];
  vaultSyncedAt: string | null; // ISO
  nodeCount: number;
}

function relTime(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - Date.parse(iso);
  if (isNaN(diff)) return iso;
  const s = Math.round(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

function readLastRitual(): string | null {
  try {
    const raw = localStorage.getItem("sky-seat-v1");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { lastRitualAt?: number };
    if (!parsed.lastRitualAt) return null;
    return new Date(parsed.lastRitualAt).toISOString();
  } catch {
    return null;
  }
}

export function StatusLine({ view, cells, vaultSyncedAt, nodeCount }: Props) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

  const urgent = cells.filter((c) => c.kind === "pressure" && c.intensity >= 0.8).length;
  const warm = cells.filter((c) => c.intensity >= 0.4 && c.intensity < 0.8).length;
  const cool = cells.filter((c) => c.intensity < 0.4).length;
  const lastRitual = readLastRitual();

  return (
    <div
      style={{
        position: "fixed",
        top: 60,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: Z.CHROME_STATUS,
        background: "rgba(22, 33, 62, 0.42)",
        border: `1px solid ${COLORS.warmStone}22`,
        borderRadius: 14,
        padding: "6px 16px",
        fontFamily: "'Nunito', system-ui, sans-serif",
        fontSize: 11,
        letterSpacing: 0.3,
        color: COLORS.softCream,
        opacity: 0.72,
        display: "flex",
        gap: 14,
        alignItems: "center",
        pointerEvents: "none",
        maxWidth: "90vw",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
      aria-label="Sky status"
    >
      <span style={{ color: COLORS.warmStone, textTransform: "uppercase", letterSpacing: 1 }}>{view}</span>
      <span style={{ opacity: 0.5 }}>·</span>
      <span>{nodeCount} stars</span>
      <span style={{ opacity: 0.5 }}>·</span>
      <span style={{ color: urgent ? COLORS.planetWarm : undefined }}>{urgent} urgent</span>
      <span style={{ opacity: 0.4 }}>/ {warm} warm / {cool} cool</span>
      <span style={{ opacity: 0.5 }}>·</span>
      <span>ritual {relTime(lastRitual)}</span>
      <span style={{ opacity: 0.5 }}>·</span>
      <span>synced {relTime(vaultSyncedAt)}</span>
    </div>
  );
}
