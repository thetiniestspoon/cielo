import { useEffect, useState } from "react";
import { COLORS } from "./celestial";

interface Props {
  nodeCount: number;
  syncedAt: string | null;
  onEnter: () => void;
}

function relTime(iso: string | null): string {
  if (!iso) return "unknown";
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

export function AnteRoom({ nodeCount, syncedAt, onEnter }: Props) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " " || e.key === "Escape") {
        e.preventDefault();
        trigger();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function trigger() {
    setFading(true);
    setTimeout(onEnter, 450);
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: COLORS.deepSky,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Fraunces', Georgia, serif",
        color: COLORS.softCream,
        opacity: fading ? 0 : 1,
        transition: "opacity 0.4s ease",
      }}
      onClick={trigger}
    >
      <div style={{ textAlign: "center", maxWidth: 440, padding: 32 }}>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 400,
            letterSpacing: 2,
            margin: "0 0 24px",
            color: COLORS.softCream,
          }}
        >
          PersonalOS Sky
        </h1>
        <p
          style={{
            fontSize: 14,
            color: COLORS.warmStone,
            lineHeight: 1.8,
            margin: "0 0 36px",
            fontFamily: "'Nunito', system-ui, sans-serif",
            opacity: 0.8,
          }}
        >
          {nodeCount.toLocaleString()} stars · synced {relTime(syncedAt)}
          <br />
          weather, stars, or both
        </p>
        <button
          onClick={trigger}
          autoFocus
          style={{
            background: "transparent",
            border: `1px solid ${COLORS.warmStone}`,
            color: COLORS.softCream,
            borderRadius: 22,
            padding: "10px 32px",
            fontSize: 13,
            letterSpacing: 1.5,
            cursor: "pointer",
            fontFamily: "'Nunito', system-ui, sans-serif",
            textTransform: "uppercase",
            transition: "background 0.2s ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(240,234,214,0.08)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        >
          Enter
        </button>
        <p
          style={{
            marginTop: 32,
            fontSize: 10,
            color: COLORS.warmStone,
            opacity: 0.4,
            fontFamily: "'Nunito', system-ui, sans-serif",
          }}
        >
          press Enter or Esc · click anywhere
        </p>
      </div>
    </div>
  );
}
