import { useEffect, useRef, useState } from "react";
import { COLORS } from "./celestial";
import type { ViewMode } from "./useSkySeat";
import type { BreathPattern } from "./settings";

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
  prompt?: string;
  breathPattern?: BreathPattern;
  silent?: boolean;
  reduceMotion?: boolean;
  onComplete: (text: string) => void;
  onSkip: () => void;
}

type Phase = "breath-in" | "breath-hold-in" | "breath-out" | "breath-hold-out" | "prompt";

function phaseSequence(pattern: BreathPattern): Array<{ phase: Phase; ms: number; label: string; scale: number; duration: string }> {
  if (pattern === "box") {
    return [
      { phase: "breath-in", ms: 4000, label: "Breathe in", scale: 1.15, duration: "4s" },
      { phase: "breath-hold-in", ms: 4000, label: "Hold", scale: 1.15, duration: "0s" },
      { phase: "breath-out", ms: 4000, label: "Breathe out", scale: 0.85, duration: "4s" },
      { phase: "breath-hold-out", ms: 4000, label: "Hold", scale: 0.85, duration: "0s" },
    ];
  }
  if (pattern === "none") {
    return [];
  }
  // default "4-6"
  return [
    { phase: "breath-in", ms: 4000, label: "Breathe in", scale: 1.15, duration: "4s" },
    { phase: "breath-out", ms: 6000, label: "Breathe out", scale: 0.85, duration: "6s" },
  ];
}

export function SkySeatRitual({ open, pendingView, prompt, breathPattern = "4-6", silent = false, reduceMotion = false, onComplete, onSkip }: RitualProps) {
  const [phaseIdx, setPhaseIdx] = useState<number>(0);
  const [inPrompt, setInPrompt] = useState(false);
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const sequence = phaseSequence(reduceMotion ? "none" : breathPattern);

  useEffect(() => {
    if (!open) {
      setPhaseIdx(0);
      setText("");
      setInPrompt(false);
      return;
    }
    // If silent mode, skip breath + prompt and complete immediately with empty text.
    if (silent) {
      onComplete("");
      return;
    }
    // If no breath pattern, go straight to prompt.
    if (sequence.length === 0) {
      setInPrompt(true);
      return;
    }
    let elapsed = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    sequence.forEach((step, i) => {
      elapsed += step.ms;
      if (i < sequence.length - 1) {
        timers.push(setTimeout(() => setPhaseIdx(i + 1), elapsed));
      }
    });
    timers.push(setTimeout(() => setInPrompt(true), elapsed));
    return () => {
      timers.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (inPrompt) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [inPrompt]);

  if (!open) return null;

  const step = sequence[phaseIdx];
  const breathLabel = step?.label ?? "";
  const breathScale = step?.scale ?? 1;
  const breathDuration = step?.duration ?? "0s";

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
      {!inPrompt ? (
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
            {prompt || "What are you the sky of right now?"}
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
