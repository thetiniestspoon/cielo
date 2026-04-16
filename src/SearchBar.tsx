import { useState, useRef, useEffect, useCallback } from "react";
import { COLORS, getCelestialColor, getCelestialType } from "./celestial";
import type { CelestialNode } from "./SkyCanvas";
import { Z } from "./z";

interface Props {
  nodes: CelestialNode[];
  onSelect: (nodeId: string) => void;
}

export function SearchBar({ nodes, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = query.length >= 1
    ? nodes
        .filter((n) => n.id.toLowerCase().includes(query.toLowerCase()))
        .sort((a, b) => {
          const aStarts = a.id.toLowerCase().startsWith(query.toLowerCase()) ? 0 : 1;
          const bStarts = b.id.toLowerCase().startsWith(query.toLowerCase()) ? 0 : 1;
          if (aStarts !== bStarts) return aStarts - bStarts;
          return b.connectionCount - a.connectionCount;
        })
        .slice(0, 7)
    : [];

  const handleSelect = useCallback((nodeId: string) => {
    onSelect(nodeId);
    setQuery("");
    setIsOpen(false);
    inputRef.current?.blur();
  }, [onSelect]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      handleSelect(results[selectedIndex].id);
    } else if (e.key === "Escape") {
      setQuery("");
      setIsOpen(false);
      inputRef.current?.blur();
    }
  }, [results, selectedIndex, handleSelect]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Global keyboard shortcut: / or Cmd+K to focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.key === "/" || (e.key === "k" && (e.metaKey || e.ctrlKey))) && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        top: 16,
        right: 16,
        zIndex: Z.CHROME_UI,
        width: 260,
      }}
    >
      <div style={{ position: "relative" }}>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => {
            // Delay to allow click on result
            setTimeout(() => setIsOpen(false), 200);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search vault... ( / )"
          style={{
            width: "100%",
            padding: "8px 12px 8px 32px",
            background: "rgba(240,234,214,0.06)",
            border: "1px solid rgba(240,234,214,0.12)",
            borderRadius: 10,
            color: COLORS.softCream,
            fontSize: 13,
            fontFamily: "'Nunito', system-ui, sans-serif",
            outline: "none",
            transition: "border-color 0.2s, background 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(240,234,214,0.1)";
          }}
          onMouseLeave={(e) => {
            if (document.activeElement !== e.currentTarget) {
              e.currentTarget.style.background = "rgba(240,234,214,0.06)";
            }
          }}
        />
        {/* Search icon */}
        <svg
          style={{
            position: "absolute",
            left: 10,
            top: "50%",
            transform: "translateY(-50%)",
            opacity: 0.4,
          }}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke={COLORS.softCream}
          strokeWidth="2"
          strokeLinecap="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </div>

      {/* Results dropdown */}
      {isOpen && results.length > 0 && (
        <div
          style={{
            marginTop: 4,
            background: "rgba(22, 33, 62, 0.95)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(240,234,214,0.12)",
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          {results.map((node, i) => (
            <button
              key={node.id}
              onMouseDown={() => handleSelect(node.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: "100%",
                padding: "8px 12px",
                background: i === selectedIndex ? "rgba(240,234,214,0.08)" : "transparent",
                border: "none",
                borderBottom: i < results.length - 1 ? "1px solid rgba(240,234,214,0.06)" : "none",
                cursor: "pointer",
                textAlign: "left",
                color: COLORS.softCream,
                fontFamily: "'Nunito', system-ui, sans-serif",
                fontSize: 13,
              }}
            >
              {/* Celestial type dot */}
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: getCelestialColor(getCelestialType(node.tags)),
                  flexShrink: 0,
                }}
              />
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {node.id}
              </span>
              <span
                style={{
                  fontSize: 10,
                  color: COLORS.warmStone,
                  opacity: 0.5,
                  textTransform: "capitalize",
                  flexShrink: 0,
                }}
              >
                {node.pillar}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
