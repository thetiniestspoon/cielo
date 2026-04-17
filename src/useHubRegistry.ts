import { useEffect, useMemo, useState } from "react";
import { slugify } from "./slugify";
import { getSupabaseClient, hasSupabaseSession } from "./supabaseClient";

function isEmbeddedContext(): boolean {
  try {
    return (
      new URLSearchParams(window.location.search).get("embedded") === "1" ||
      window.self !== window.top
    );
  } catch {
    return false;
  }
}

async function fetchHubsFromSupabase(): Promise<Record<string, Hub> | null> {
  try {
    const client = await getSupabaseClient();
    if (!client) return null;
    const { data, error } = await client
      .from("vault_hubs")
      .select("id,title,pillar,summary,canonical_path,type,visibility");
    if (error || !Array.isArray(data)) return null;
    const out: Record<string, Hub> = {};
    for (const row of data) {
      out[row.id] = {
        id: row.id,
        title: row.title,
        pillar: row.pillar,
        summary: row.summary ?? undefined,
        canonical_path: row.canonical_path ?? undefined,
        type: row.type,
        visibility: row.visibility,
      };
    }
    return out;
  } catch {
    return null;
  }
}

async function fetchSignalsFromSupabase(): Promise<SignalsFile["hubs"] | null> {
  try {
    const client = await getSupabaseClient();
    if (!client) return null;
    const { data, error } = await client
      .from("vault_signals")
      .select("id,weight,activity_weight,presence_weight,touch_count_7d,last_touched");
    if (error || !Array.isArray(data)) return null;
    const out: SignalsFile["hubs"] = {};
    for (const row of data) {
      out[row.id] = {
        weight: row.weight ?? 0,
        activity_weight: row.activity_weight ?? undefined,
        presence_weight: row.presence_weight ?? undefined,
        touch_count_7d: row.touch_count_7d ?? undefined,
        last_touched: row.last_touched ?? undefined,
      };
    }
    return out;
  } catch {
    return null;
  }
}

// Cortex v2 hub shape (subset we care about). See
// _meta/cortex/build_hubs.py for the source of truth.
interface Hub {
  id: string;
  title: string;
  pillar: string;
  summary?: string;
  canonical_path?: string;
  // Cortex v2 taxonomy: project hubs drive the Activity axis, person
  // hubs drive the Presence axis, place/artifact are rarer.
  type?: "project" | "person" | "place" | "artifact";
  // visibility=private hubs are filtered out of standalone (public)
  // Cielo; rendered only when embedded in an auth-gated parent.
  visibility?: "public" | "private";
}

interface HubsFile {
  generated: string;
  schema_version?: number;
  hubs: Record<string, Hub>;
}

interface SignalsFile {
  generated: string;
  global_decay?: number;
  hubs: Record<
    string,
    {
      weight: number;
      activity_weight?: number;
      presence_weight?: number;
      touch_count_7d?: number;
      last_touched?: string;
    }
  >;
}

export interface HubBinding {
  slug: string;
  type: Hub["type"];
  visibility: Hub["visibility"];
  activity: number;
  presence: number;
  weight: number;
}

const UNKNOWN: HubBinding = {
  slug: "",
  type: "project",
  visibility: "public",
  activity: 0,
  presence: 0,
  weight: 0,
};

function fetchJsonOrNull<T>(url: string): Promise<T | null> {
  return fetch(url)
    .then((r) => (r.ok ? (r.json() as Promise<T>) : null))
    .catch(() => null);
}

// Loads hubs.json + signals.json and returns a slug-keyed map of the
// fields Cielo cares about. A lookup helper `bindingFor(nodeId)`
// slugifies the node title on the fly — matches the Python cortex
// slugify so stars align with their hub entries.
export function useHubRegistry() {
  const [hubs, setHubs] = useState<Record<string, Hub> | null>(null);
  const [signals, setSignals] = useState<SignalsFile["hubs"] | null>(null);

  useEffect(() => {
    const base = (import.meta.env.VITE_DATA_BASE as string | undefined) || import.meta.env.BASE_URL;
    let cancelled = false;

    (async () => {
      // Supabase branch: embedded + authed operator session present.
      if (isEmbeddedContext() && (await hasSupabaseSession())) {
        const [h, s] = await Promise.all([
          fetchHubsFromSupabase(),
          fetchSignalsFromSupabase(),
        ]);
        if (!cancelled && h && s) {
          setHubs(h);
          setSignals(s);
          return;
        }
        // Eligible for Supabase but fetch failed — warn once, continue to static.
        console.warn("[useHubRegistry] Supabase fetch failed; falling back to static hubs.json");
      }

      // Static fallback — vault_hubs stays public-only once Plan 05 retires the file.
      const [h, s] = await Promise.all([
        fetchJsonOrNull<HubsFile>(`${base}hubs.json`),
        fetchJsonOrNull<SignalsFile>(`${base}weather/heat.json`),
      ]);
      if (cancelled) return;
      setHubs(h?.hubs ?? {});
      setSignals(s?.hubs ?? {});
    })();

    return () => { cancelled = true; };
  }, []);

  const bindings = useMemo<Map<string, HubBinding>>(() => {
    const m = new Map<string, HubBinding>();
    if (!hubs && !signals) return m;
    const slugs = new Set<string>([
      ...Object.keys(hubs ?? {}),
      ...Object.keys(signals ?? {}),
    ]);
    for (const slug of slugs) {
      const h = hubs?.[slug];
      const s = signals?.[slug];
      m.set(slug, {
        slug,
        type: h?.type ?? "project",
        visibility: h?.visibility ?? "public",
        activity: s?.activity_weight ?? 0,
        presence: s?.presence_weight ?? 0,
        weight: s?.weight ?? 0,
      });
    }
    return m;
  }, [hubs, signals]);

  function bindingFor(nodeId: string): HubBinding {
    const slug = slugify(nodeId);
    return bindings.get(slug) ?? { ...UNKNOWN, slug };
  }

  return {
    bindings,
    bindingFor,
    loaded: hubs !== null && signals !== null,
  };
}
