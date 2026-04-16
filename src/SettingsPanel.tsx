import { useEffect, useState } from "react";
import { COLORS } from "./celestial";
import type { SkySettings, BreathPattern } from "./settings";
import { Z } from "./z";

interface Props {
  settings: SkySettings;
  onUpdate: (patch: Partial<SkySettings>) => void;
  pinnedLabels: string[];
  onUnpin: (id: string) => void;
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: 0.5,
  textTransform: "uppercase",
  color: COLORS.warmStone,
  marginBottom: 6,
  display: "block",
};

const rowStyle: React.CSSProperties = {
  marginBottom: 18,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(240,234,214,0.05)",
  border: `1px solid ${COLORS.warmStone}33`,
  borderRadius: 8,
  padding: "8px 12px",
  color: COLORS.softCream,
  fontSize: 13,
  fontFamily: "'Nunito', system-ui, sans-serif",
  outline: "none",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: "none",
};

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? "rgba(240,234,214,0.12)" : "rgba(240,234,214,0.03)",
        border: `1px solid ${active ? COLORS.warmStone : "rgba(240,234,214,0.1)"}`,
        color: active ? COLORS.softCream : "rgba(240,234,214,0.5)",
        borderRadius: 16,
        padding: "4px 12px",
        fontSize: 11,
        cursor: "pointer",
        fontFamily: "'Nunito', system-ui, sans-serif",
        marginRight: 6,
      }}
    >
      {label}
    </button>
  );
}

export function SettingsButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title="Settings"
      aria-label="Settings"
      style={{
        position: "fixed",
        top: 16,
        right: 16,
        zIndex: Z.CHROME_UI,
        background: "rgba(22, 33, 62, 0.55)",
        backdropFilter: "blur(12px)",
        border: `1px solid ${COLORS.warmStone}33`,
        borderRadius: "50%",
        width: 36,
        height: 36,
        color: COLORS.warmStone,
        cursor: "pointer",
        fontSize: 16,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {"\u2699"}
    </button>
  );
}

export function SettingsPanel({ settings, onUpdate, pinnedLabels, onUnpin }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  return (
    <>
      <SettingsButton onClick={() => setOpen(true)} />
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(26, 26, 46, 0.78)",
            backdropFilter: "blur(8px)",
            zIndex: Z.MODAL,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "rgba(22, 33, 62, 0.96)",
              border: `1px solid ${COLORS.warmStone}33`,
              borderRadius: 14,
              padding: 24,
              width: "min(520px, 90vw)",
              maxHeight: "85vh",
              overflowY: "auto",
              fontFamily: "'Nunito', system-ui, sans-serif",
              color: COLORS.softCream,
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 20, margin: 0, fontWeight: 500 }}>Settings</h2>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                style={{ background: "none", border: "none", color: COLORS.warmStone, fontSize: 20, cursor: "pointer", opacity: 0.6 }}
              >
                {"\u00d7"}
              </button>
            </div>

            <div style={rowStyle}>
              <label style={labelStyle}>Motion</label>
              <div>
                <Chip label="Auto (OS)" active={settings.reduceMotion === null} onClick={() => onUpdate({ reduceMotion: null })} />
                <Chip label="Full motion" active={settings.reduceMotion === false} onClick={() => onUpdate({ reduceMotion: false })} />
                <Chip label="Reduced" active={settings.reduceMotion === true} onClick={() => onUpdate({ reduceMotion: true })} />
              </div>
              <p style={{ fontSize: 10, opacity: 0.5, margin: "6px 0 0" }}>Reduced stops orbital drift, weather drift, and crossfades.</p>
            </div>

            <div style={rowStyle}>
              <label style={labelStyle}>Breath pattern</label>
              <div>
                <Chip label="4 / 6" active={settings.ritualBreathPattern === "4-6"} onClick={() => onUpdate({ ritualBreathPattern: "4-6" as BreathPattern })} />
                <Chip label="Box (4·4·4·4)" active={settings.ritualBreathPattern === "box"} onClick={() => onUpdate({ ritualBreathPattern: "box" as BreathPattern })} />
                <Chip label="None" active={settings.ritualBreathPattern === "none"} onClick={() => onUpdate({ ritualBreathPattern: "none" as BreathPattern })} />
              </div>
            </div>

            <div style={rowStyle}>
              <label style={labelStyle}>Ritual prompt</label>
              <input
                type="text"
                value={settings.ritualPrompt}
                onChange={(e) => onUpdate({ ritualPrompt: e.target.value })}
                style={inputStyle}
              />
              <div style={{ marginTop: 8 }}>
                <Chip
                  label={settings.ritualSilent ? "Silent mode ON" : "Silent mode OFF"}
                  active={settings.ritualSilent}
                  onClick={() => onUpdate({ ritualSilent: !settings.ritualSilent })}
                />
              </div>
              <p style={{ fontSize: 10, opacity: 0.5, margin: "6px 0 0" }}>
                Silent: switch views without the breath or prompt. Ritual is still throttled to 30-min.
              </p>
            </div>

            <div style={rowStyle}>
              <label style={labelStyle}>Auto-dismiss detail</label>
              <select
                value={settings.autoDismissMs}
                onChange={(e) => onUpdate({ autoDismissMs: Number(e.target.value) })}
                style={selectStyle}
              >
                <option value={0}>Never</option>
                <option value={15000}>15 seconds</option>
                <option value={30000}>30 seconds</option>
                <option value={60000}>1 minute</option>
                <option value={180000}>3 minutes</option>
              </select>
              <p style={{ fontSize: 10, opacity: 0.5, margin: "6px 0 0" }}>Closes the detail overlay after this long without interaction.</p>
            </div>

            <div style={rowStyle}>
              <label style={labelStyle}>Presentation</label>
              <div>
                <Chip label={settings.showInfoHalos ? "Info halos ON" : "Info halos OFF"} active={settings.showInfoHalos} onClick={() => onUpdate({ showInfoHalos: !settings.showInfoHalos })} />
                <Chip label={settings.boundedUniverse ? "Bounded universe" : "Infinite canvas"} active={settings.boundedUniverse} onClick={() => onUpdate({ boundedUniverse: !settings.boundedUniverse })} />
                <Chip label={settings.anteRoomEnabled ? "Ante-room ON" : "Ante-room OFF"} active={settings.anteRoomEnabled} onClick={() => onUpdate({ anteRoomEnabled: !settings.anteRoomEnabled })} />
              </div>
            </div>

            <div style={rowStyle}>
              <label style={labelStyle}>Pinned anchors ({pinnedLabels.length})</label>
              {pinnedLabels.length === 0 ? (
                <p style={{ fontSize: 12, opacity: 0.5, margin: 0 }}>Open any note's detail and tap "pin" to anchor it.</p>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {pinnedLabels.map((id) => (
                    <button
                      key={id}
                      onClick={() => onUnpin(id)}
                      title="Click to unpin"
                      style={{
                        background: "rgba(168, 181, 160, 0.15)",
                        border: `1px solid ${COLORS.sageGreen}55`,
                        borderRadius: 14,
                        padding: "4px 10px",
                        fontSize: 11,
                        color: COLORS.sageGreen,
                        cursor: "pointer",
                        fontFamily: "'Nunito', system-ui, sans-serif",
                      }}
                    >
                      {"\u2605 "}{id.length > 30 ? id.slice(0, 28) + "\u2026" : id}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
