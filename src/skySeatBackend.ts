// Pluggable backend for sky-seat log/entries. In dev, writes go to the
// Vite middleware which appends to a vault markdown file. In prod, a
// Supabase-backed adapter can be swapped in once env vars are set.
//
// NEEDS-USER (prod path): set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
// in .env.local (dev) or Vercel/GH Pages secrets (prod), apply the
// migration in supabase/migrations/, then import the SupabaseAdapter
// below from App.tsx (replacing the default DevAdapter).

export interface SkySeatEntry {
  date: string;        // YYYY-MM-DD
  lines: { time: string; view: string; text: string }[];
}

export interface SkySeatBackend {
  log(text: string, view: string): Promise<void>;
  list(days: number): Promise<SkySeatEntry[]>;
}

// --- Dev adapter (default) — uses the Vite middleware endpoints. -----

export const DevAdapter: SkySeatBackend = {
  async log(text, view) {
    await fetch("/api/sky-seat/log", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text, view }),
    });
  },
  async list(days) {
    const r = await fetch(`/api/sky-seat/entries?days=${days}`);
    if (!r.ok) throw new Error(`fetch entries: ${r.status}`);
    const data = (await r.json()) as { entries: SkySeatEntry[] };
    return data.entries;
  },
};

// --- Supabase adapter (prod) ----------------------------------------
//
// Enable by installing @supabase/supabase-js and providing env vars:
//   VITE_SUPABASE_URL=https://<ref>.supabase.co
//   VITE_SUPABASE_ANON_KEY=<anon key>
//
// Then import and pass to JournalPanel / useSkySeat instead of DevAdapter.

export function makeSupabaseAdapter(
  url: string,
  anonKey: string
): SkySeatBackend {
  // Lazy-load to keep the supabase client out of the bundle unless used.
  let clientPromise: Promise<any> | null = null;
  async function getClient() {
    if (!clientPromise) {
      clientPromise = import(/* @vite-ignore */ "@supabase/supabase-js").then(
        (m) => m.createClient(url, anonKey)
      );
    }
    return clientPromise;
  }

  return {
    async log(text, view) {
      const supabase = await getClient();
      const { error } = await supabase.from("sky_seat_entries").insert({ text, view });
      if (error) throw error;
    },
    async list(days) {
      const supabase = await getClient();
      const since = new Date(Date.now() - days * 86400000).toISOString();
      const { data, error } = await supabase
        .from("sky_seat_entries")
        .select("created_at, text, view")
        .gte("created_at", since)
        .order("created_at", { ascending: false });
      if (error) throw error;
      // Group by day (YYYY-MM-DD).
      const byDay = new Map<string, SkySeatEntry["lines"]>();
      for (const row of data ?? []) {
        const d = new Date(row.created_at);
        const date = d.toISOString().slice(0, 10);
        const time = d.toISOString().slice(11, 16);
        if (!byDay.has(date)) byDay.set(date, []);
        byDay.get(date)!.push({ time, view: row.view, text: row.text });
      }
      return [...byDay.entries()].map(([date, lines]) => ({ date, lines }));
    },
  };
}

// Pick which adapter is live based on env vars.
export const skySeatBackend: SkySeatBackend = (() => {
  const url = (import.meta as any).env?.VITE_SUPABASE_URL;
  const key = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;
  if (url && key) return makeSupabaseAdapter(url, key);
  return DevAdapter;
})();
