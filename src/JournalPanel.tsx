import { useEffect, useState } from "react";
import { COLORS } from "./celestial";

interface Entry {
  date: string; // YYYY-MM-DD
  lines: { time: string; view: string; text: string }[];
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export function JournalButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title="Sky-seat journal"
      aria-label="Journal"
      style={{
        position: "fixed",
        top: 16,
        right: 60,
        zIndex: 15,
        background: "rgba(22, 33, 62, 0.55)",
        backdropFilter: "blur(12px)",
        border: `1px solid ${COLORS.warmStone}33`,
        borderRadius: "50%",
        width: 36,
        height: 36,
        color: COLORS.warmStone,
        cursor: "pointer",
        fontSize: 15,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {"\u270D"}
    </button>
  );
}

export function JournalPanel({ open, onClose }: Props) {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setEntries(null);
    setError(null);
    fetch("/api/sky-seat/entries?days=30")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: { entries: Entry[] }) => setEntries(data.entries))
      .catch((e) => setError(String(e)));
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(26, 26, 46, 0.78)",
        backdropFilter: "blur(8px)",
        zIndex: 40,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "rgba(22, 33, 62, 0.96)",
          border: `1px solid ${COLORS.warmStone}33`,
          borderRadius: 14,
          padding: 24,
          width: "min(640px, 92vw)",
          maxHeight: "85vh",
          overflowY: "auto",
          fontFamily: "'Nunito', system-ui, sans-serif",
          color: COLORS.softCream,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 20, margin: 0, fontWeight: 500 }}>
            Sky-seat journal
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ background: "none", border: "none", color: COLORS.warmStone, fontSize: 20, cursor: "pointer", opacity: 0.6 }}
          >
            {"\u00d7"}
          </button>
        </div>

        {error && (
          <p style={{ fontSize: 12, color: COLORS.planetWarm, opacity: 0.8 }}>
            Could not load: {error}
          </p>
        )}
        {!entries && !error && (
          <p style={{ fontSize: 12, opacity: 0.5 }}>loading…</p>
        )}
        {entries && entries.length === 0 && (
          <p style={{ fontSize: 12, opacity: 0.5 }}>
            No entries yet. Toggle a view to begin.
          </p>
        )}
        {entries && entries.map((day) => (
          <div key={day.date} style={{ marginBottom: 24 }}>
            <h3
              style={{
                fontFamily: "'Fraunces', Georgia, serif",
                fontSize: 14,
                fontWeight: 400,
                color: COLORS.warmStone,
                letterSpacing: 1,
                borderBottom: `1px solid ${COLORS.warmStone}22`,
                paddingBottom: 6,
                marginBottom: 10,
              }}
            >
              {day.date}
            </h3>
            {day.lines.map((line, i) => (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto auto 1fr",
                  gap: 12,
                  marginBottom: 6,
                  fontSize: 13,
                  lineHeight: 1.5,
                }}
              >
                <span style={{ color: COLORS.warmStone, opacity: 0.6 }}>{line.time}</span>
                <span
                  style={{
                    fontSize: 10,
                    color: COLORS.sageGreen,
                    opacity: 0.7,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    alignSelf: "center",
                  }}
                >
                  {line.view}
                </span>
                <span>{line.text}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
