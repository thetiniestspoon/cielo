import { useState, useEffect } from "react";
import type { VaultGraph } from "./types";

export function useVaultGraph() {
  const [graph, setGraph] = useState<VaultGraph | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/vault_graph.json")
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load vault graph: ${res.status}`);
        return res.json();
      })
      .then((data: VaultGraph) => setGraph(data))
      .catch((err) => setError(err.message));
  }, []);

  return { graph, error };
}
