import { describe, it, expect } from "vitest";
import { findClusters, indexClustersByNode } from "./horoscope";
import type { VaultGraph } from "./types";

const sampleGraph: VaultGraph = {
  nodes: [
    { id: "A", path: "A.md", pillar: "growth", tags: ["app"], description: "", connectionCount: 3 },
    { id: "B", path: "B.md", pillar: "growth", tags: ["app"], description: "", connectionCount: 2 },
    { id: "C", path: "C.md", pillar: "growth", tags: ["person"], description: "", connectionCount: 1 },
    { id: "D", path: "D.md", pillar: "growth", tags: ["idea"], description: "", connectionCount: 1 },
    { id: "X", path: "X.md", pillar: "spirit", tags: ["idea"], description: "", connectionCount: 0 },
  ],
  edges: [
    { source: "A", target: "B", label: "", bidirectional: true },
    { source: "A", target: "C", label: "", bidirectional: false },
    { source: "A", target: "D", label: "", bidirectional: false },
  ],
  meta: { noteCount: 5, edgeCount: 3, pillarCounts: { growth: 4, spirit: 1 } },
};

describe("horoscope", () => {
  it("finds clusters of minSize and assigns archetype names", () => {
    const clusters = findClusters(sampleGraph, 4);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].nodeIds.sort()).toEqual(["A", "B", "C", "D"]);
    expect(clusters[0].hubId).toBe("A"); // highest connectionCount
    expect(clusters[0].name).toMatch(/^The /);
  });

  it("skips components smaller than minSize", () => {
    const clusters = findClusters(sampleGraph, 6);
    expect(clusters).toHaveLength(0);
  });

  it("produces stable names across runs for the same graph", () => {
    const a = findClusters(sampleGraph, 4).map((c) => c.name);
    const b = findClusters(sampleGraph, 4).map((c) => c.name);
    expect(a).toEqual(b);
  });

  it("indexes node -> cluster for overlay lookups", () => {
    const clusters = findClusters(sampleGraph, 4);
    const idx = indexClustersByNode(clusters);
    expect(idx.get("A")?.id).toBe(clusters[0].id);
    expect(idx.get("X")).toBeUndefined();
  });
});
