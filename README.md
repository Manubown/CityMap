# CityMap

Build and connect multiple cities into a working inter-city economy — evolving settlements from the **Stone Age** to **Mega Cities**. Inspired by **Anno 1800** (production chains + population needs), **Cities: Skylines** (scale + organic growth) and **Transport Fever 2** (logistics + trade routes between regions).

> Status: **Slice 1** — a single-region sandbox proving the core loop: render an isometric map, place stone-age buildings on a grid, and watch a short production chain fill the stockpile. Saves persist to the browser (IndexedDB).

## Stack

- **TypeScript + Vite**
- **PixiJS v8** (WebGPU/WebGL) — renders the isometric world
- **React** — the HUD overlay (resource bar, build bar, selection panel)
- **Zustand** — UI-facing state
- **IndexedDB** (`idb-keyval`) — saves

The **simulation** (`src/engine/**`) is engine-agnostic: it imports neither PixiJS nor React, so it stays deterministic and testable, and rendering / UI / a future server can all read from it.

## Getting started

```bash
npm install
npm run dev        # start the dev server (http://localhost:5173)
npm test           # run the engine tests
npm run build      # typecheck + production build
```

## Controls

- **Drag** (or **WASD** / arrow keys) — pan the camera
- **Mouse wheel** — zoom
- **Build bar** (bottom) — pick a building, move the cursor to preview the footprint, **left-click** to place
- **Right-click / Esc** — cancel build mode
- **Click a building** — inspect it in the selection panel

## Project layout

```
src/
  engine/   simulation — iso math, world state, building registry, map gen, production, tick, saves
  render/   PixiJS — app, camera, picking, terrain, entities, placement ghost
  ui/       React HUD + Zustand store
docs/
  GDD.md                game design document (pillars, ages, economy, expansion)
  asset-prompts/        nano-banana (Gemini image) prompts for sprites
```

See `docs/GDD.md` for the full design and `docs/asset-prompts/` for generating art.

## Art assets

- **Terrain** uses CC0 isometric tiles from **Screaming Brain Studios**
  ([1000+ Isometric Floor Tiles](https://opengameart.org/content/1000-isometric-floor-tiles)).
  The source sheets live in `art-src/sbs/`; `scripts/slice-terrain.py` cuts them
  into per-type variants (grass/forest/dirt/rock) with the black background keyed
  out, into `public/assets/terrain/<type>/*.png` + `src/render/terrainSprites.json`.
  The renderer picks a variant per tile by hash (no repetition) and overlaps tiles
  slightly to hide seams. Terrain without a tile (e.g. water) falls back to the
  vector low-poly tile (`drawPolyTile` in `src/render/shapes.ts`). See `CREDITS.md`.
- **Buildings** and **resource icons** are nano-banana (Gemini image) sprites in
  `public/assets/{buildings,ui}/`, loaded by PixiJS at runtime
  (`src/render/PixiApp.ts`). Each building sprite has an entry in
  `src/render/spriteManifest.json` (trimmed size, ground anchor, base width) so
  the renderer pins it to the isometric grid; a missing sprite falls back to an
  extruded Graphics block.

The building/icon sprites are generated from raw nano PNGs via
`scripts/process-assets.py`, which:

1. removes the opaque background (border-connected white/grey + the warm "god-ray"
   and drop-shadow) to get real transparency, keeping interior highlights;
2. auto-crops + downscales;
3. detects each sprite's isometric **ground axis** (widest opaque row in the lower
   half) and writes the manifest.

To (re)generate from a folder of raw nano PNGs (default `../images/assets`):

```bash
python3 -m venv .venv && .venv/bin/pip install Pillow numpy scipy
.venv/bin/python scripts/process-assets.py
```

> Prompt templates for generating fresh art are in `docs/asset-prompts/`. To
> switch buildings to vector art too (for full stylistic consistency), the
> EntityLayer already supports a Graphics fallback — extend `drawBuildingBlock`.
