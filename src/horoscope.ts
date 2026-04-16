import type { VaultGraph, VaultNode, VaultEdge, Pillar } from "./types";

// Archetype pool — deterministic assignment by hub seed, so the same vault
// state produces the same names across reloads. Not tied 1:1 to pillars;
// the pillar biases which subset to draw from.
const ARCHETYPES: Record<Pillar | "any", string[]> = {
  growth: ["The Garden", "The Bellows", "The Forge", "The Threshold"],
  relationship: ["The Loom", "The Hearth", "The Tender", "The Vessel"],
  spirit: ["The Lantern", "The Watcher", "The Vessel", "The Tender"],
  foundations: ["The Anchor", "The Ledger", "The Archive", "The Hearth"],
  exploration: ["The Compass", "The Wayfarer", "The Archive", "The Lantern"],
  any: [
    "The Hearth", "The Forge", "The Lantern", "The Loom", "The Compass",
    "The Anchor", "The Ledger", "The Threshold", "The Garden", "The Archive",
    "The Bellows", "The Wayfarer", "The Tender", "The Watcher", "The Vessel",
  ],
};

export interface Cluster {
  id: string;
  name: string;
  nodeIds: string[];
  pillar: Pillar;
  hubId: string;
  cx: number; // centroid, filled at render time
  cy: number;
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Connected components via BFS over the bidirectional adjacency of edges.
export function findClusters(graph: VaultGraph, minSize = 4): Cluster[] {
  const adj = new Map<string, Set<string>>();
  for (const n of graph.nodes) adj.set(n.id, new Set());
  for (const e of graph.edges) {
    if (!adj.has(e.source) || !adj.has(e.target)) continue;
    adj.get(e.source)!.add(e.target);
    adj.get(e.target)!.add(e.source);
  }

  const nodeById = new Map<string, VaultNode>(graph.nodes.map((n) => [n.id, n]));
  const visited = new Set<string>();
  const clusters: Cluster[] = [];
  const usedNames = new Set<string>();

  for (const start of graph.nodes) {
    if (visited.has(start.id)) continue;
    const component: string[] = [];
    const queue = [start.id];
    visited.add(start.id);
    while (queue.length) {
      const cur = queue.shift()!;
      component.push(cur);
      for (const nb of adj.get(cur) ?? []) {
        if (!visited.has(nb)) {
          visited.add(nb);
          queue.push(nb);
        }
      }
    }
    if (component.length < minSize) continue;

    // Hub = node with highest connectionCount in component
    let hub = component[0];
    let hubCount = -1;
    for (const id of component) {
      const n = nodeById.get(id)!;
      if (n.connectionCount > hubCount) {
        hub = id;
        hubCount = n.connectionCount;
      }
    }

    // Dominant pillar = most common pillar in component
    const pillarCounts = new Map<string, number>();
    for (const id of component) {
      const p = (nodeById.get(id)!.pillar ?? "exploration").toString().toLowerCase() as Pillar;
      pillarCounts.set(p, (pillarCounts.get(p) ?? 0) + 1);
    }
    const dominantPillar = [...pillarCounts.entries()].sort((a, b) => b[1] - a[1])[0][0] as Pillar;

    // Deterministic name: seed with hub id, pick from pillar pool, fall back to "any"
    const pool = ARCHETYPES[dominantPillar] ?? ARCHETYPES.any;
    const seed = hashString(hub);
    let name = pool[seed % pool.length];
    // Resolve collisions against other clusters
    if (usedNames.has(name)) {
      const anyPool = ARCHETYPES.any;
      for (let i = 0; i < anyPool.length; i++) {
        const candidate = anyPool[(seed + i) % anyPool.length];
        if (!usedNames.has(candidate)) {
          name = candidate;
          break;
        }
      }
    }
    usedNames.add(name);

    clusters.push({
      id: `cluster-${clusters.length}`,
      name,
      nodeIds: component,
      pillar: dominantPillar,
      hubId: hub,
      cx: 0,
      cy: 0,
    });
  }

  return clusters;
}

// Given clusters and positioned nodes, compute centroids.
export function computeCentroids<N extends { id: string; x?: number | null; y?: number | null }>(
  clusters: Cluster[],
  nodes: N[]
): Cluster[] {
  const posById = new Map<string, { x: number; y: number }>();
  for (const n of nodes) {
    if (typeof n.x === "number" && typeof n.y === "number") posById.set(n.id, { x: n.x, y: n.y });
  }
  return clusters.map((c) => {
    let sx = 0,
      sy = 0,
      count = 0;
    for (const id of c.nodeIds) {
      const p = posById.get(id);
      if (!p) continue;
      sx += p.x;
      sy += p.y;
      count++;
    }
    return count
      ? { ...c, cx: sx / count, cy: sy / count }
      : c;
  });
}

// Also expose a helper that gives each node its cluster name, for overlay display.
export function indexClustersByNode(clusters: Cluster[]): Map<string, Cluster> {
  const m = new Map<string, Cluster>();
  for (const c of clusters) {
    for (const id of c.nodeIds) m.set(id, c);
  }
  return m;
}

// References suppress "unused" lints for edge import in some configs.
export type _HoroscopeEdgeRef = VaultEdge;
