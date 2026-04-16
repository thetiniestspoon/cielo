import { useCallback, useEffect, useState } from "react";

export type ViewMode = "stars" | "weather" | "both";

const STORAGE_KEY = "sky-seat-v1";
const RITUAL_MIN_INTERVAL_MS = 1000 * 60 * 30; // don't prompt twice within 30 min

interface Persisted {
  view: ViewMode;
  lastRitualAt: number; // epoch ms
}

function loadPersisted(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { view: "stars", lastRitualAt: 0 };
    const parsed = JSON.parse(raw) as Partial<Persisted>;
    return {
      view: parsed.view ?? "stars",
      lastRitualAt: parsed.lastRitualAt ?? 0,
    };
  } catch {
    return { view: "stars", lastRitualAt: 0 };
  }
}

export function useSkySeat() {
  const [view, setViewState] = useState<ViewMode>(() => loadPersisted().view);
  const [ritualOpen, setRitualOpen] = useState(false);
  const [pendingView, setPendingView] = useState<ViewMode | null>(null);

  useEffect(() => {
    const persisted = loadPersisted();
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...persisted, view })
    );
  }, [view]);

  const requestView = useCallback((next: ViewMode) => {
    if (next === view) return;
    const persisted = loadPersisted();
    const dueForRitual =
      Date.now() - persisted.lastRitualAt > RITUAL_MIN_INTERVAL_MS;
    if (dueForRitual) {
      setPendingView(next);
      setRitualOpen(true);
    } else {
      setViewState(next);
    }
  }, [view]);

  const completeRitual = useCallback(
    async (text: string) => {
      const next = pendingView;
      const persisted = loadPersisted();
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ...persisted, lastRitualAt: Date.now() })
      );
      if (text.trim()) {
        try {
          await fetch("/api/sky-seat/log", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ text, view: next ?? view }),
          });
        } catch (err) {
          console.warn("[sky-seat] log failed", err);
        }
      }
      if (next) setViewState(next);
      setPendingView(null);
      setRitualOpen(false);
    },
    [pendingView, view]
  );

  const cancelRitual = useCallback(() => {
    // Cancelling still transitions the view — ritual is skippable by design.
    if (pendingView) setViewState(pendingView);
    setPendingView(null);
    setRitualOpen(false);
  }, [pendingView]);

  return { view, requestView, ritualOpen, pendingView, completeRitual, cancelRitual };
}
