# Credits — third-party assets

## Terrain tiles
**Isometric Floor Tiles** by **Screaming Brain Studios** — License: **CC0 1.0**
(public domain; attribution not required, given with thanks).
- Source: https://opengameart.org/content/1000-isometric-floor-tiles
- Used: base ground, forest, and rocky 128×64 tiles, sliced into per-type
  variants by `scripts/slice-terrain.py`. Source sheets kept in `art-src/sbs/`.

## Decorations (trees + rocks)
**Isometric Asset Pack: Forest** (free "Vanilla" sample) by **Rafael Sewa**
— License: **CC BY-NC-SA 4.0**.
- Source: https://rafaelsewa.itch.io/iso-asset-pack-forest
- Used: tree + rock props, trimmed by `scripts/slice-decor.py` into
  `public/assets/decor/`. Source kept in `art-src/AssetPack01_Forest_Sample/`.
- ⚠️ **NonCommercial + ShareAlike.** Fine for a hobby/prototype **with
  attribution**, but these assets MUST NOT ship in a commercial build. To go
  commercial: buy the pack's commercial palettes, or replace these with the
  built-in vector tree/rock props (`drawTreeProp` / `drawMountainProp` in
  `src/render/shapes.ts`) — the decoration layer falls back to them
  automatically if the sprites are removed.

## Other assets
- Building + resource-icon sprites in `public/assets/{buildings,ui}/` are
  project-generated (nano-banana / Gemini image), processed by
  `scripts/process-assets.py`.
- Terrain types without a tile (e.g. water) render as vector low-poly tiles
  (`src/render/shapes.ts`).

> When adding more OpenGameArt packs, record each one here with its license and
> author. CC0 needs no attribution; CC-BY/CC-BY-SA require crediting the author
> (and CC-BY-SA keeps the derived art under the same license).
