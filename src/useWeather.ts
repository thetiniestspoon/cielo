import { useEffect, useMemo, useState } from "react";
import type { Pillar } from "./types";

export type WeatherKind = "pressure" | "heat" | "mood";

export interface WeatherCell {
  id: string;
  kind: WeatherKind;
  label: string;
  detail: string;
  pillar: Pillar;
  // 0..1 — drives visual size/opacity
  intensity: number;
  // days until this fades from the dashboard if untouched (computed from source half-life)
  halfLifeDays: number;
  lastTouched: string | null;
  sourceLink?: string;
}

interface PressureProject {
  project: string;
  icon?: string;
  stream?: string;
  staleness?: string; // urgent | stale | dormant | recent | active
  recentCommits?: string;
  daysSinceLastCommit?: number | null;
  lastCommitISO?: string | null;
  links?: Record<string, string>;
}

interface PressureSnapshot {
  generated: string;
  urgent?: PressureProject[];
  stale?: PressureProject[];
  dormant?: PressureProject[];
  recent?: PressureProject[];
  active?: PressureProject[];
}

interface SignalsFile {
  generated: string;
  global_decay?: number;
  hubs: Record<
    string,
    {
      weight: number;
      touch_count_7d: number;
      last_touched: string;
      sources?: unknown[];
    }
  >;
}

interface MoodEntry {
  timestamp: string;
  phase?: string;
  summary?: string;
  mood?: string;
  stream?: string;
  nextSteps?: unknown[];
}

type MoodFile = Record<string, MoodEntry>;

// Map streams/free text to pillars with simple heuristics.
function streamToPillar(stream?: string, name?: string): Pillar {
  const s = (stream || "").toLowerCase();
  const n = (name || "").toLowerCase();
  if (s.includes("community") || s.includes("ministry")) return "spirit";
  if (s.includes("family") || s.includes("care")) return "relationship";
  if (n.includes("finance") || n.includes("totem") || n.includes("ledger")) return "foundations";
  if (n.includes("keepsakes") || n.includes("archive")) return "foundations";
  if (n.includes("research") || n.includes("explor")) return "exploration";
  return "growth";
}

function slugToPillar(slug: string): Pillar {
  const s = slug.toLowerCase();
  if (s.includes("finance") || s.includes("totem") || s.includes("ledger")) return "foundations";
  if (s.includes("beacon") || s.includes("spirit") || s.includes("chapel") || s.includes("uu")) return "spirit";
  if (s.includes("family") || s.includes("partner") || s.includes("people")) return "relationship";
  if (s.includes("research") || s.includes("idea") || s.includes("explor")) return "exploration";
  return "growth";
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function fetchJsonOrNull<T>(url: string): Promise<T | null> {
  return fetch(url)
    .then((r) => (r.ok ? (r.json() as Promise<T>) : null))
    .catch(() => null);
}

export function useWeather() {
  const [pressure, setPressure] = useState<PressureSnapshot | null>(null);
  const [heat, setHeat] = useState<SignalsFile | null>(null);
  const [mood, setMood] = useState<MoodFile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const base = (import.meta.env.VITE_DATA_BASE as string | undefined) || import.meta.env.BASE_URL;
    Promise.all([
      fetchJsonOrNull<PressureSnapshot>(`${base}weather/pressure.json`),
      fetchJsonOrNull<SignalsFile>(`${base}weather/heat.json`),
      fetchJsonOrNull<MoodFile>(`${base}weather/mood.json`),
    ])
      .then(([p, h, m]) => {
        setPressure(p);
        setHeat(h);
        setMood(m);
      })
      .catch((e) => setError(String(e)));
  }, []);

  const cells: WeatherCell[] = useMemo(() => {
    const out: WeatherCell[] = [];

    // Pressure fronts: urgent = intensity ~1, stale = 0.55, dormant = 0.25
    if (pressure) {
      const bucketize = (arr: PressureProject[] | undefined, kind: string, intensity: number, halfLifeDays: number) => {
        (arr ?? []).forEach((p, i) => {
          out.push({
            id: `pressure-${kind}-${i}-${p.project}`,
            kind: "pressure",
            label: p.project,
            detail: `${kind}${p.recentCommits ? " · " + p.recentCommits : ""}${p.stream ? " · stream " + p.stream : ""}`,
            pillar: streamToPillar(p.stream, p.project),
            intensity,
            halfLifeDays,
            lastTouched: p.lastCommitISO ?? null,
            sourceLink: p.links?.live || p.links?.repo,
          });
        });
      };
      bucketize(pressure.urgent, "urgent", 0.95, 1);
      bucketize(pressure.stale, "stale", 0.55, 3);
      bucketize(pressure.dormant, "dormant", 0.28, 14);
    }

    // Heat: hubs with nontrivial weight. Use global_decay to infer half-life.
    if (heat) {
      const decay = heat.global_decay ?? 0.95;
      // weight(t) = w * decay^t  →  t_half = log(0.5) / log(decay)
      const halfLifeDays = Math.max(1, Math.round(Math.log(0.5) / Math.log(decay)));
      const entries = Object.entries(heat.hubs || {});
      for (const [slug, h] of entries) {
        if (!h || h.weight < 0.15) continue; // only show warm-ish heat
        out.push({
          id: `heat-${slug}`,
          kind: "heat",
          label: slug.replace(/^\d+-/, "").replace(/-/g, " "),
          detail: `heat ${h.weight.toFixed(2)} · touched ${h.touch_count_7d}×/7d`,
          pillar: slugToPillar(slug),
          intensity: clamp01(h.weight),
          halfLifeDays,
          lastTouched: h.last_touched,
        });
      }
    }

    // Mood: per-project most-recent phase.  Use mood keyword as intensity proxy.
    if (mood) {
      for (const [slug, entry] of Object.entries(mood)) {
        if (!entry?.timestamp) continue;
        const moodKey = (entry.mood || "").toLowerCase();
        let intensity = 0.4;
        if (moodKey.includes("momentum") || moodKey.includes("energiz")) intensity = 0.8;
        else if (moodKey.includes("drift") || moodKey.includes("stall")) intensity = 0.35;
        else if (moodKey.includes("block") || moodKey.includes("stuck")) intensity = 0.9;

        out.push({
          id: `mood-${slug}`,
          kind: "mood",
          label: slug,
          detail: `${entry.mood ?? "mood"}${entry.phase ? " · " + entry.phase : ""}`,
          pillar: streamToPillar(entry.stream, slug),
          intensity,
          halfLifeDays: 2,
          lastTouched: entry.timestamp,
        });
      }
    }

    return out;
  }, [pressure, heat, mood]);

  return { cells, error, loaded: pressure !== null || heat !== null || mood !== null };
}
