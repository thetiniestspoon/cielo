# Cielo

Celestial graph visualization of a knowledge vault — D3.js force-directed constellation map with search, navigation, and pillar-based sectoring.

## Overview

A force-directed graph that renders vault nodes as a star field. Nodes attract and repel based on relationships, with zoom/pan controls, full-text search, breadcrumb navigation history, and detail overlays. Organized by pillar-based sectors (Observatory, Bistro, Studio views).

## Tech Stack

- Frontend: React 19 + TypeScript + Vite
- Visualization: D3.js (d3-force, d3-selection, d3-zoom, d3-transition)

## Key Components

| Component | Purpose |
|-----------|---------|
| `SkyCanvas` | D3 force-directed graph rendering |
| `StarField` | Background star animation |
| `DetailOverlay` | Node information panel |
| `SearchBar` | Full-text search across nodes |
| `Legend` | Node type reference |
| `Breadcrumbs` | Navigation history |

## Getting Started

```bash
npm install
npm run dev
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
