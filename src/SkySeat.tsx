import { useEffect, useRef, useState } from "react";
import { COLORS } from "./celestial";
import type { ViewMode } from "./useSkySeat";

interface ToggleProps {
  view: ViewMode;
  onRequestView: (v: ViewMode) => void;
}

const MODES: { value: ViewMode; label: string }[] = [
  { value: "stars", label: "Stars" },
  { value: "both", label: "Both" },
  { value: "weather", label: "Weather" },
];

export function SkySeatToggle({ view, onRequestView }: ToggleProps) {
  return (
    <div
      style={{
        position: "fixed",
        top: 16,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        gap: 0,
        zIndex: 15,
        background: "rgba(22, 33, 62, 0.55)",
        backdropFilter: "blur(12px)",
        border: `1px solid ${COLORS.warmStone}33`,
        borderRadius: 24,
        padding: 4,
        fontFamily: "'Nunito', system-ui, sans-serif",
      }}
    >
      {MODES.map((m) => {
        const active = view === m.value;
        return (
          <button
            key={m.value}
            onClick={() => onRequestView(m.value)}
            style={{
              background: active ? "rgba(240,234,214,0.12)" : "transparent",
              border: "none",
              color: active ? COLORS.softCream : "rgba(240,234,214,0.45)",
              borderRadius: 20,
              padding: "6px 18px",
              fontSize: 12,
              letterSpacing: 0.4,
              cursor: "pointer",
              transition: "all 0.3s ease",
              fontFamily: "inherit",
            }}
          >
            {m.label}
          </button>
        );
      })}
    </div>
  );
}

interface RitualProps {
  open: boolean;
  pendingView: ViewMode | null;
  onComplete: (text: string) => void;
  onSkip: () => void;
}

type Phase = "breath-in" | "breath-out" | "prompt";

export function SkySeatRitual({ open, pendingView, onComplete, onSkip }: RitualProps) {
  const [phase, setPhase] = useState<Phase>("breath-in");
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!open) {
      setPhase("breath-in");
      setText("");
      return;
    }
    const t1 = setTimeout(() => setPhase("breath-out"), 4000);
    const t2 = setTimeout(() => setPhase("prompt"), 10000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [open]);

  useEffect(() => {
    if (phase === "prompt") {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [phase]);

  if (!open) return null;

  const breathLabel = phase === "breath-in" ? "Breathe in" : phase === "breath-out" ? "Breathe out" : "";
  const breathScale = phase === "breath-in" ? 1.15 : phase === "breath-out" ? 0.85 : 1;
  const breathDuration = phase === "breath-in" ? "4s" : "6s";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(26, 26, 46, 0.78)",
        backdropFilter: "blur(14px)",
        zIndex: 30,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "fadeIn 0.5s ease",
        fontFamily: "'Fraunces', Georgia, serif",
        color: COLORS.softCream,
      }}
    >
      {phase !== "prompt" ? (
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: "50%",
              border: `1px solid ${COLORS.warmStone}`,
              margin: "0 auto 24px",
              transform: `scale(${breathScale})`,
              transition: `transform ${breathDuration} ease-in-out`,
              background: `radial-gradient(circle, ${COLORS.starGlow}22 0%, transparent 70%)`,
            }}
          />
          <p style={{ fontSize: 22, letterSpacing: 1, opacity: 0.85 }}>{breathLabel}</p>
          <button
            onClick={onSkip}
            style={{
              marginTop: 32,
              background: "none",
              border: `1px solid ${COLORS.warmStone}33`,
              color: "rgba(240,234,214,0.5)",
              padding: "6px 16px",
              borderRadius: 18,
              fontSize: 11,
              cursor: "pointer",
              fontFamily: "'Nunito', system-ui, sans-serif",
            }}
          >
            skip
          </button>
        </div>
      ) : (
        <div style={{ maxWidth: 520, width: "90%", textAlign: "center" }}>
          <p
            style={{
              fontSize: 22,
              lineHeight: 1.4,
              margin: "0 0 24px",
              color: COLORS.softCream,
            }}
          >
            What are you the sky of right now?
          </p>
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onComplete(text);
              }
              if (e.key === "Escape") onSkip();
            }}
            rows={3}
            placeholder="one line is enough"
            style={{
              width: "100%",
              background: "rgba(240,234,214,0.05)",
              border: `1px solid ${COLORS.warmStone}33`,
              borderRadius: 12,
              padding: "14px 18px",
              color: COLORS.softCream,
              fontSize: 16,
              fontFamily: "'Nunito', system-ui, sans-serif",
              resize: "none",
              outline: "none",
            }}
          />
          <div style={{ marginTop: 20, display: "flex", gap: 12, justifyContent: "center" }}>
            <button
              onClick={onSkip}
              style={{
                background: "none",
                border: `1px solid ${COLORS.warmStone}33`,
                color: "rgba(240,234,214,0.5)",
                padding: "8px 18px",
                borderRadius: 18,
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "'Nunito', system-ui, sans-serif",
              }}
            >
              skip
            </button>
            <button
              onClick={() => onComplete(text)}
              disabled={!text.trim()}
              style={{
                background: text.trim() ? COLORS.warmStone : "rgba(196,180,154,0.2)",
                border: "none",
                color: text.trim() ? COLORS.deepSky : "rgba(240,234,214,0.3)",
                padding: "8px 22px",
                borderRadius: 18,
                fontSize: 12,
                cursor: text.trim() ? "pointer" : "not-allowed",
                fontFamily: "'Nunito', system-ui, sans-serif",
                fontWeight: 600,
                letterSpacing: 0.5,
              }}
            >
              {pendingView ? `enter ${pendingView}` : "log"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
