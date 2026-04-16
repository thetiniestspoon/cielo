import { useState, useEffect } from "react";
import type { VaultGraph } from "./types";

const SNAPSHOT_KEY = "sky-last-graph-ids";

export interface GraphDiff {
  added: string[];
  removed: string[];
}

export function useVaultGraph() {
  const [graph, setGraph] = useState<VaultGraph | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const [diff, setDiff] = useState<GraphDiff | null>(null);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}vault_graph.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load vault graph: ${res.status}`);
        const lastModified = res.headers.get("last-modified");
        if (lastModified) setSyncedAt(new Date(lastModified).toISOString());
        return res.json();
      })
      .then((data: VaultGraph) => {
        setGraph(data);
        try {
          const prevRaw = localStorage.getItem(SNAPSHOT_KEY);
          const currentIds = new Set(data.nodes.map((n) => n.id));
          if (prevRaw) {
            const prev = new Set<string>(JSON.parse(prevRaw));
            const added = [...currentIds].filter((id) => !prev.has(id));
            const removed = [...prev].filter((id) => !currentIds.has(id));
            if (added.length || removed.length) setDiff({ added, removed });
          }
          localStorage.setItem(SNAPSHOT_KEY, JSON.stringify([...currentIds]));
        } catch {
          // snapshot diffing is best-effort
        }
      })
      .catch((err) => setError(err.message));
  }, []);

  return { graph, error, syncedAt, diff, clearDiff: () => setDiff(null) };
}
