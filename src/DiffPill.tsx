import { useState } from "react";
import { COLORS } from "./celestial";
import type { GraphDiff } from "./useVaultGraph";
import { Z } from "./z";

interface Props {
  diff: GraphDiff;
  onDismiss: () => void;
}

export function DiffPill({ diff, onDismiss }: Props) {
  const [expanded, setExpanded] = useState(false);
  const total = diff.added.length + diff.removed.length;
  if (!total) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 100,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: Z.CHROME_NOTICE,
        background: "rgba(22, 33, 62, 0.85)",
        backdropFilter: "blur(8px)",
        border: `1px solid ${COLORS.sageGreen}55`,
        borderRadius: 12,
        padding: "10px 16px",
        fontFamily: "'Nunito', system-ui, sans-serif",
        fontSize: 12,
        color: COLORS.softCream,
        maxWidth: "80vw",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <span style={{ color: COLORS.sageGreen }}>
          {"\u25BC"} {diff.added.length > 0 ? `+${diff.added.length}` : ""}
          {diff.added.length > 0 && diff.removed.length > 0 && " "}
          {diff.removed.length > 0 ? `−${diff.removed.length}` : ""} since last session
        </span>
        {total > 0 && (
          <button
            onClick={() => setExpanded((e) => !e)}
            style={{
              background: "none",
              border: "none",
              color: COLORS.warmStone,
              cursor: "pointer",
              fontSize: 11,
              fontFamily: "inherit",
              textDecoration: "underline",
              opacity: 0.6,
            }}
          >
            {expanded ? "hide" : "show"}
          </button>
        )}
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          style={{ background: "none", border: "none", color: COLORS.warmStone, cursor: "pointer", fontSize: 16, opacity: 0.5 }}
        >
          {"\u00d7"}
        </button>
      </div>
      {expanded && (
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4, maxHeight: 220, overflowY: "auto" }}>
          {diff.added.map((id) => (
            <span key={"a-" + id} style={{ color: COLORS.sageGreen, fontSize: 11 }}>+ {id}</span>
          ))}
          {diff.removed.map((id) => (
            <span key={"r-" + id} style={{ color: COLORS.planetWarm, fontSize: 11, opacity: 0.7 }}>− {id}</span>
          ))}
        </div>
      )}
    </div>
  );
}
