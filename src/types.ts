export type Pillar = "growth" | "relationship" | "spirit" | "foundations" | "exploration";

export type CelestialType = "star" | "planet" | "comet" | "firefly";

export interface VaultNode {
  id: string;
  path: string;
  pillar: Pillar;
  tags: string[];
  description: string;
  connectionCount: number;
}

export interface VaultEdge {
  source: string;
  target: string;
  label: string;
  bidirectional: boolean;
}

export interface VaultGraph {
  nodes: VaultNode[];
  edges: VaultEdge[];
  meta: {
    noteCount: number;
    edgeCount: number;
    pillarCounts: Record<string, number>;
  };
}

export interface SimNode extends VaultNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  celestialType: CelestialType;
  radius: number;
  color: string;
}

export interface SimEdge {
  source: SimNode;
  target: SimNode;
  label: string;
  bidirectional: boolean;
}
