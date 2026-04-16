import { useEffect, useRef, useState } from "react";
import type { VaultEdge, CelestialType, Pillar } from "./types";
import { COLORS, getCelestialColor } from "./celestial";

interface OverlayNode {
  id: string;
  path: string;
  pillar: Pillar;
  tags: string[];
  description: string;
  connectionCount: number;
  celestialType: CelestialType;
}

interface Props {
  node: OverlayNode;
  edges: VaultEdge[];
  onClose: () => void;
  onNavigate: (nodeId: string) => void;
  onBack?: () => void;
  pinned?: boolean;
  onTogglePin?: () => void;
  autoDismissMs?: number;
}

const CELESTIAL_LABELS: Record<CelestialType, string> = {
  star: "Star",
  planet: "Planet",
  comet: "Comet",
  firefly: "Firefly",
};

export function DetailOverlay({ node, edges, onClose, onNavigate, onBack, pinned, onTogglePin, autoDismissMs = 0 }: Props) {
  const [expanded, setExpanded] = useState(false);
  const obsidianUrl = `obsidian://open?vault=PersonalOS-Vault&file=${encodeURIComponent(node.path.replace(/\.md$/, ""))}`;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const idleRef = useRef<number>(Date.now() + autoDismissMs);

  // Auto-dismiss: reset timer on any interaction within the overlay.
  useEffect(() => {
    if (autoDismissMs <= 0) return;
    idleRef.current = Date.now() + autoDismissMs;
    const id = setInterval(() => {
      if (Date.now() >= idleRef.current) {
        onClose();
      }
    }, 500);
    return () => clearInterval(id);
  }, [node.id, autoDismissMs, onClose]);

  const bumpIdle = () => {
    if (autoDismissMs > 0) idleRef.current = Date.now() + autoDismissMs;
  };

  const connections = edges.map((e) => {
    const connectedId = e.source === node.id ? e.target : e.source;
    return { id: connectedId, label: e.label };
  });

  return (
    <div
      ref={containerRef}
      onMouseMove={bumpIdle}
      onMouseDown={bumpIdle}
      onKeyDown={bumpIdle}
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        maxHeight: expanded ? "55vh" : "28vh",
        background: "rgba(22, 33, 62, 0.95)",
        backdropFilter: "blur(20px)",
        borderTop: "1px solid rgba(168, 181, 160, 0.2)",
        borderRadius: "16px 16px 0 0",
        padding: "16px 24px",
        zIndex: 20,
        overflowY: expanded ? "auto" : "hidden",
        fontFamily: "'Nunito', system-ui, sans-serif",
        color: COLORS.softCream,
        animation: "slideUp 0.3s ease-out",
        transition: "max-height 0.3s ease",
      }}
    >
      {/* Header row: back + title + badges + obsidian link + close */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        {/* Back button */}
        {onBack && (
          <button
            onClick={onBack}
            style={{
              background: "none",
              border: "none",
              color: COLORS.warmStone,
              fontSize: 16,
              cursor: "pointer",
              padding: "2px 6px",
              opacity: 0.6,
              transition: "opacity 0.2s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.6"; }}
            aria-label="Back"
          >
            {"\u2190"}
          </button>
        )}

        {/* Title */}
        <h2
          style={{
            fontFamily: "'Fraunces', Georgia, serif",
            fontSize: 20,
            fontWeight: 600,
            margin: 0,
            color: getCelestialColor(node.celestialType),
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {node.id}
        </h2>

        {/* Badges (inline) */}
        <span
          style={{
            background: "rgba(240,234,214,0.08)",
            border: "1px solid rgba(240,234,214,0.15)",
            borderRadius: 12,
            padding: "2px 8px",
            fontSize: 10,
            color: COLORS.warmStone,
            whiteSpace: "nowrap",
            textTransform: "capitalize",
          }}
        >
          {node.pillar}
        </span>
        <span
          style={{
            background: "rgba(240,234,214,0.08)",
            border: `1px solid ${getCelestialColor(node.celestialType)}33`,
            borderRadius: 12,
            padding: "2px 8px",
            fontSize: 10,
            color: getCelestialColor(node.celestialType),
            whiteSpace: "nowrap",
          }}
        >
          {CELESTIAL_LABELS[node.celestialType]}
        </span>

        {/* Pin */}
        {onTogglePin && (
          <button
            onClick={onTogglePin}
            title={pinned ? "Unpin — stop anchoring this" : "Pin — keep this visible across filters"}
            style={{
              padding: "4px 10px",
              background: pinned ? "rgba(168, 181, 160, 0.22)" : "rgba(168, 181, 160, 0.06)",
              border: `1px solid ${COLORS.sageGreen}55`,
              borderRadius: 6,
              color: pinned ? COLORS.sageGreen : COLORS.warmStone,
              fontSize: 11,
              cursor: "pointer",
              fontFamily: "'Nunito', system-ui, sans-serif",
            }}
          >
            {pinned ? "\u2605 pinned" : "\u2606 pin"}
          </button>
        )}

        {/* Obsidian link */}
        <a
          href={obsidianUrl}
          style={{
            padding: "4px 8px",
            background: "rgba(168, 181, 160, 0.1)",
            border: `1px solid ${COLORS.sageGreen}33`,
            borderRadius: 6,
            color: COLORS.sageGreen,
            textDecoration: "none",
            fontSize: 11,
            whiteSpace: "nowrap",
            transition: "background 0.2s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(168, 181, 160, 0.2)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(168, 181, 160, 0.1)"; }}
        >
          Obsidian {"\u2192"}
        </a>

        {/* Close */}
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: COLORS.warmStone,
            fontSize: 18,
            cursor: "pointer",
            padding: "2px 6px",
            opacity: 0.6,
          }}
          aria-label="Close"
        >
          {"\u00d7"}
        </button>
      </div>

      {/* Description (clamped) */}
      {node.description && (
        <p
          style={{
            fontSize: 13,
            lineHeight: 1.5,
            color: COLORS.softCream,
            opacity: 0.8,
            margin: "0 0 12px 0",
            maxWidth: 700,
            display: "-webkit-box",
            WebkitLineClamp: expanded ? 999 : 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {node.description}
          {!expanded && node.description.length > 120 && (
            <button
              onClick={() => setExpanded(true)}
              style={{
                background: "none",
                border: "none",
                color: COLORS.sageGreen,
                cursor: "pointer",
                fontSize: 12,
                fontFamily: "'Nunito', system-ui, sans-serif",
                padding: "0 4px",
                display: "inline",
              }}
            >
              more
            </button>
          )}
        </p>
      )}

      {/* Connections as horizontal scrollable chips */}
      {connections.length > 0 && (
        <div>
          <div
            style={{
              fontSize: 11,
              color: COLORS.sageGreen,
              marginBottom: 6,
              fontWeight: 600,
            }}
          >
            Connections ({connections.length})
          </div>
          <div
            style={{
              display: "flex",
              gap: 6,
              overflowX: "auto",
              paddingBottom: 4,
              scrollbarWidth: "thin",
            }}
          >
            {connections.map((c) => (
              <button
                key={c.id}
                onClick={() => onNavigate(c.id)}
                title={c.label || c.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "4px 10px",
                  background: "rgba(240,234,214,0.04)",
                  border: "1px solid rgba(136,144,164,0.15)",
                  borderRadius: 14,
                  cursor: "pointer",
                  color: COLORS.softCream,
                  fontFamily: "'Nunito', system-ui, sans-serif",
                  fontSize: 12,
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(240,234,214,0.1)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(240,234,214,0.04)"; }}
              >
                <span style={{ color: COLORS.constellationLine }}>{"\u2014"}</span>
                {c.id.length > 22 ? c.id.slice(0, 20) + "\u2026" : c.id}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Expand toggle */}
      {!expanded && (connections.length > 4 || (node.description && node.description.length > 120)) && (
        <button
          onClick={() => setExpanded(true)}
          style={{
            display: "block",
            margin: "8px auto 0",
            background: "none",
            border: "none",
            color: COLORS.warmStone,
            fontSize: 11,
            cursor: "pointer",
            opacity: 0.5,
            fontFamily: "'Nunito', system-ui, sans-serif",
          }}
        >
          {"\u25bc"} expand
        </button>
      )}
    </div>
  );
}
