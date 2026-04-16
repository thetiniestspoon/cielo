import { COLORS, getCelestialColor } from "./celestial";
import type { CelestialNode } from "./SkyCanvas";

interface Props {
  history: string[];
  nodes: CelestialNode[];
  onNavigate: (nodeId: string) => void;
  selectedId: string | null;
}

export function Breadcrumbs({ history, nodes, onNavigate, selectedId }: Props) {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // Show last 8, collapse older ones
  const visible = history.length > 8 ? history.slice(-8) : history;
  const hasCollapsed = history.length > 8;

  return (
    <div
      style={{
        position: "fixed",
        bottom: selectedId ? "calc(28vh + 8px)" : 48,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        alignItems: "center",
        gap: 4,
        zIndex: 15,
        maxWidth: "80vw",
        overflow: "hidden",
        transition: "bottom 0.3s ease",
      }}
    >
      {hasCollapsed && (
        <span
          style={{
            color: COLORS.warmStone,
            fontSize: 11,
            opacity: 0.4,
            padding: "2px 6px",
            fontFamily: "'Nunito', system-ui, sans-serif",
          }}
        >
          ...
        </span>
      )}
      {visible.map((nodeId, i) => {
        const node = nodeMap.get(nodeId);
        const isActive = nodeId === selectedId;
        const color = node ? getCelestialColor(node.celestialType) : COLORS.warmStone;

        return (
          <button
            key={`${nodeId}-${i}`}
            onClick={() => onNavigate(nodeId)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "3px 10px",
              background: isActive ? "rgba(240,234,214,0.12)" : "rgba(240,234,214,0.04)",
              border: `1px solid ${isActive ? "rgba(240,234,214,0.2)" : "rgba(240,234,214,0.08)"}`,
              borderRadius: 14,
              cursor: "pointer",
              color: COLORS.softCream,
              fontFamily: "'Nunito', system-ui, sans-serif",
              fontSize: 11,
              whiteSpace: "nowrap",
              transition: "background 0.2s",
              opacity: isActive ? 1 : 0.6,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(240,234,214,0.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = isActive ? "rgba(240,234,214,0.12)" : "rgba(240,234,214,0.04)";
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: color,
                flexShrink: 0,
              }}
            />
            <span>
              {nodeId.length > 16 ? nodeId.slice(0, 14) + "\u2026" : nodeId}
            </span>
            {i < visible.length - 1 && (
              <span style={{ color: COLORS.constellationLine, marginLeft: 2, opacity: 0.4 }}>
                \u203a
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
