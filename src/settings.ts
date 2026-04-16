import { useEffect, useState, useCallback } from "react";

export type BreathPattern = "4-6" | "box" | "none";
export type Preset = "morning" | "evening" | null;
export type Theme = "night" | "daylight";

export interface SkySettings {
  // Motion
  reduceMotion: boolean | null; // null = follow OS prefers-reduced-motion
  // Ritual
  ritualBreathPattern: BreathPattern;
  ritualPrompt: string;
  ritualSilent: boolean;
  // Detail overlay
  autoDismissMs: number; // 0 = never
  // Startup
  anteRoomEnabled: boolean;
  // Anchors
  pinnedNodes: string[];
  // Presentation
  showInfoHalos: boolean;
  boundedUniverse: boolean;
  theme: Theme;
  // Presets / cycle
  activePreset: Preset;
}

export const DEFAULTS: SkySettings = {
  reduceMotion: null,
  ritualBreathPattern: "4-6",
  ritualPrompt: "What are you the sky of right now?",
  ritualSilent: false,
  autoDismissMs: 30000,
  anteRoomEnabled: true,
  pinnedNodes: [],
  showInfoHalos: true,
  boundedUniverse: true,
  theme: "night",
  activePreset: null,
};

const STORAGE_KEY = "sky-settings-v1";

function load(): SkySettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<SkySettings>) };
  } catch {
    return DEFAULTS;
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<SkySettings>(load);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const update = useCallback((patch: Partial<SkySettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const togglePin = useCallback((nodeId: string) => {
    setSettings((prev) => {
      const set = new Set(prev.pinnedNodes);
      if (set.has(nodeId)) set.delete(nodeId);
      else set.add(nodeId);
      return { ...prev, pinnedNodes: [...set] };
    });
  }, []);

  return { settings, update, togglePin } as const;
}

export function isMotionReduced(s: SkySettings): boolean {
  if (s.reduceMotion !== null) return s.reduceMotion;
  if (typeof window === "undefined") return false;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

// Deterministic hash for seeded layout — FNV-1a 32-bit.
export function hashId(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Map a hash to a float in [-1, 1], stable across sessions.
export function seededOffset(s: string, salt: string): number {
  const h = hashId(s + ":" + salt);
  return ((h / 0xffffffff) * 2) - 1;
}
