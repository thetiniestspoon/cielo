// Semantic z-index tokens. Named by the stratum they occupy so intent is
// visible at the call site. Any new layer should slot into one of these
// strata rather than pick a new magic number.
//
// Stacking strata, deepest to nearest:
//
//   BACKGROUND  — the real night sky backdrop. Never demands attention.
//   CONTENT     — the constellation graph. The subject of the app.
//   WEATHER     — drifting weather cells. Above stars, below anything
//                 the user is deliberately engaging with.
//   PINNED      — pinned anchor halos. Always visible at full strength,
//                 independent of view-mode dimming or weather cover.
//   CHROME_INFO — passive readouts: legend, title.
//   CHROME_STATUS — status line. Read-only, always-on, top band.
//   CHROME_NOTICE — dismissible notices: diff pill. Above status so it
//                 wins when they collide.
//   CHROME_UI   — interactive chrome: toggles, search, buttons,
//                 breadcrumbs. All peers; spatially separated.
//   FOCUS       — the detail overlay for a specific node.
//   RITUAL      — the breath / prompt. Transient interruption.
//   MODAL       — settings, journal. User-invoked, dominant.
//   GATE        — the ante-room. Threshold; nothing renders above.

export const Z = {
  BACKGROUND: 0,
  CONTENT: 1,
  WEATHER: 5,
  PINNED: 7,
  CHROME_INFO: 10,
  CHROME_STATUS: 12,
  CHROME_NOTICE: 13,
  CHROME_UI: 15,
  FOCUS: 20,
  RITUAL: 30,
  MODAL: 40,
  GATE: 50,
} as const;

export type ZLayer = keyof typeof Z;
