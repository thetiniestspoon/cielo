import { useEffect, useMemo, useState } from "react";
import { COLORS, getPillarSectorTarget, PILLAR_ORDER } from "./celestial";
import type { Pillar } from "./types";
import type { WeatherCell } from "./useWeather";

interface Props {
  cells: WeatherCell[];
  opacity: number; // overall layer opacity (crossfade)
  width: number;
  height: number;
}

interface Positioned extends WeatherCell {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  radius: number;
  phase: number;
}

const KIND_COLOR: Record<WeatherCell["kind"], string> = {
  pressure: COLORS.planetWarm,
  heat: COLORS.starGlow,
  mood: COLORS.cometTrail,
};

function halfLifePhrase(days: number, lastTouched: string | null): string {
  if (!lastTouched) return `half-life ${days}d`;
  const diff = (Date.now() - Date.parse(lastTouched)) / (1000 * 60 * 60 * 24);
  const remaining = Math.max(0, days - diff);
  if (remaining < 1) return `fading now`;
  return `fades in ${Math.round(remaining)}d unless touched`;
}

export function WeatherLayer({ cells, opacity, width, height }: Props) {
  const [tick, setTick] = useState(0);
  const [hovered, setHovered] = useState<string | null>(null);

  // Slow drift animation — 12s per cycle at ~30fps equivalent.
  useEffect(() => {
    if (opacity <= 0.01) return; // don't animate if hidden
    const id = setInterval(() => setTick((t) => t + 1), 80);
    return () => clearInterval(id);
  }, [opacity]);

  const positioned: Positioned[] = useMemo(() => {
    const cx = width / 2;
    const cy = height / 2;
    const spread = Math.min(width, height) * 0.3;
    // Count by pillar to spread cells within a sector
    const perPillarCount: Record<Pillar, number> = {
      growth: 0, relationship: 0, spirit: 0, foundations: 0, exploration: 0,
    };
    const pillarTotals: Record<Pillar, number> = {
      growth: 0, relationship: 0, spirit: 0, foundations: 0, exploration: 0,
    };
    for (const c of cells) pillarTotals[c.pillar as Pillar] = (pillarTotals[c.pillar as Pillar] ?? 0) + 1;

    return cells.map((c, i) => {
      const pillar = c.pillar as Pillar;
      const idxInPillar = perPillarCount[pillar]++;
      const total = pillarTotals[pillar] || 1;
      const sector = getPillarSectorTarget(pillar, cx, cy, spread * 1.15);
      // Distribute along a tangent within the sector
      const jitterAngle = ((idxInPillar / total) - 0.5) * 1.1;
      const ring = spread * 1.05 + (idxInPillar % 2) * 40;
      const baseX = cx + Math.cos(Math.atan2(sector.y - cy, sector.x - cx) + jitterAngle) * ring;
      const baseY = cy + Math.sin(Math.atan2(sector.y - cy, sector.x - cx) + jitterAngle) * ring;
      const radius = 22 + c.intensity * 46;
      const phase = (i * 13.37) % (Math.PI * 2);
      return { ...c, baseX, baseY, x: baseX, y: baseY, radius, phase };
    });
  }, [cells, width, height]);

  if (opacity <= 0.01) return null;

  const t = tick * 0.03;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        opacity,
        transition: "opacity 0.5s ease",
        zIndex: 5,
      }}
    >
      <svg width={width} height={height} style={{ display: "block" }}>
        <defs>
          <filter id="weather-blur" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="12" />
          </filter>
        </defs>
        {positioned.map((c) => {
          const driftX = Math.cos(t + c.phase) * 8;
          const driftY = Math.sin(t * 0.8 + c.phase * 1.3) * 6;
          const isHovered = hovered === c.id;
          return (
            <g
              key={c.id}
              style={{ pointerEvents: "auto", cursor: "pointer" }}
              onMouseEnter={() => setHovered(c.id)}
              onMouseLeave={() => setHovered((h) => (h === c.id ? null : h))}
            >
              <circle
                cx={c.baseX + driftX}
                cy={c.baseY + driftY}
                r={c.radius}
                fill={KIND_COLOR[c.kind]}
                fillOpacity={isHovered ? 0.38 : 0.22}
                filter="url(#weather-blur)"
              />
              <circle
                cx={c.baseX + driftX}
                cy={c.baseY + driftY}
                r={c.radius * 0.42}
                fill={KIND_COLOR[c.kind]}
                fillOpacity={isHovered ? 0.6 : 0.35}
              />
              {isHovered && (
                <g>
                  <rect
                    x={c.baseX + driftX + c.radius + 8}
                    y={c.baseY + driftY - 28}
                    width={260}
                    height={58}
                    rx={10}
                    fill="rgba(22, 33, 62, 0.92)"
                    stroke={KIND_COLOR[c.kind]}
                    strokeOpacity={0.4}
                  />
                  <text
                    x={c.baseX + driftX + c.radius + 20}
                    y={c.baseY + driftY - 10}
                    fill={COLORS.softCream}
                    fontSize={12}
                    fontFamily="'Fraunces', Georgia, serif"
                  >
                    {c.label}
                  </text>
                  <text
                    x={c.baseX + driftX + c.radius + 20}
                    y={c.baseY + driftY + 6}
                    fill={COLORS.warmStone}
                    fontSize={10}
                    fontFamily="'Nunito', system-ui, sans-serif"
                    opacity={0.9}
                  >
                    {c.detail}
                  </text>
                  <text
                    x={c.baseX + driftX + c.radius + 20}
                    y={c.baseY + driftY + 22}
                    fill={COLORS.sageGreen}
                    fontSize={10}
                    fontFamily="'Nunito', system-ui, sans-serif"
                    opacity={0.8}
                  >
                    {halfLifePhrase(c.halfLifeDays, c.lastTouched)}
                  </text>
                </g>
              )}
            </g>
          );
        })}
        {/* Pillar labels stay anchored — same positions, but a bit brighter in weather mode */}
        {PILLAR_ORDER.map((p) => {
          const spread = Math.min(width, height) * 0.3;
          const target = getPillarSectorTarget(p, width / 2, height / 2, spread);
          return (
            <text
              key={`w-pillar-${p}`}
              x={target.x}
              y={target.y - spread * 0.35}
              textAnchor="middle"
              fill={COLORS.softCream}
              fillOpacity={0.18}
              fontSize={20}
              fontFamily="'Fraunces', Georgia, serif"
              style={{ pointerEvents: "none" }}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
