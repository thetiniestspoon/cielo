import type { VaultNode, CelestialType, Pillar } from "./types";

// Constellations Design System colors
export const COLORS = {
  // Primary palette
  deepSky: "#1a1a2e",
  nightHorizon: "#16213e",
  sageGreen: "#a8b5a0",
  warmStone: "#c4b49a",
  softCream: "#f0ead6",

  // Celestial accent palette
  planetWarm: "#d4a574",
  cometTrail: "#7eb8c9",
  starGlow: "#e8d5a3",
  firefly: "#c9d4a0",
  constellationLine: "#8890a4",

  // Pillar sector tints
  pillars: {
    growth: "#2a2a1e",
    relationship: "#2e1a2a",
    spirit: "#1a2a2e",
    foundations: "#2e2a1a",
    exploration: "#1a2e1e",
  } as Record<Pillar, string>,
};

// Map vault tags to celestial types
export function getCelestialType(tags: string[]): CelestialType {
  if (tags.includes("person")) return "planet";
  if (tags.includes("practice")) return "comet";
  if (tags.includes("idea")) return "firefly";
  // app, project, game, writing, chaplaincy, etc. → star
  return "star";
}

// Get color for a celestial type
export function getCelestialColor(type: CelestialType): string {
  switch (type) {
    case "planet": return COLORS.planetWarm;
    case "comet": return COLORS.cometTrail;
    case "firefly": return COLORS.firefly;
    case "star": return COLORS.starGlow;
  }
}

// Get node radius based on celestial type and connection count
export function getNodeRadius(type: CelestialType, connectionCount: number): number {
  const base = type === "firefly" ? 3 : type === "comet" ? 5 : type === "planet" ? 7 : 5;
  return base + Math.sqrt(connectionCount) * 1.5;
}

// Pillar angular sectors (radians) — 5 sectors of ~72 degrees each
const PILLAR_ORDER: Pillar[] = ["growth", "relationship", "spirit", "foundations", "exploration"];

export function getPillarAngle(pillar: Pillar): number {
  const idx = PILLAR_ORDER.indexOf(pillar);
  if (idx === -1) return 0;
  return (idx / PILLAR_ORDER.length) * Math.PI * 2 - Math.PI / 2;
}

export function getPillarSectorTarget(pillar: Pillar, cx: number, cy: number, spread: number): { x: number; y: number } {
  const angle = getPillarAngle(pillar);
  return {
    x: cx + Math.cos(angle) * spread,
    y: cy + Math.sin(angle) * spread,
  };
}

export function prepareCelestialNode(node: VaultNode) {
  const celestialType = getCelestialType(node.tags);
  return {
    ...node,
    celestialType,
    color: getCelestialColor(celestialType),
    radius: getNodeRadius(celestialType, node.connectionCount),
  };
}

export { PILLAR_ORDER };
