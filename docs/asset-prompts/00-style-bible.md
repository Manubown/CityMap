# CityMap — Art Style Bible (nano banana / Gemini image)

This is the **shared header** for every asset prompt. Paste the **STYLE HEADER**
block at the top of each individual asset prompt so everything stays consistent.
Consistency comes from fixing four things every time: **camera angle, light
direction, format, and palette.**

---

## STYLE HEADER (prepend to every prompt)

```
Isometric 2.5D game asset in a warm, stylized illustrated style — think a cozy
historical city-builder (Anno-like) diorama. Clean readable silhouette, soft
painterly shading, gentle ambient occlusion, no harsh outlines.

Camera: classic 2:1 isometric video-game angle (dimetric, ~30° from horizontal),
viewed straight-on. NO perspective distortion, NO vanishing point — parallel
projection only.

Lighting: soft key light from the UPPER-LEFT, gentle sky fill, warm tone.
Keep this light direction identical across ALL assets.

Format: a SINGLE object, centered, on a FULLY TRANSPARENT background (PNG alpha).
No scene, no ground tile, no grass, no border — only the object and a small soft
contact shadow directly beneath it. High resolution, crisp edges.
```

---

## Palette (keep assets within this range)

These match the in-game placeholder colors so generated art drops in cleanly.

| Use | Hex |
|-----|-----|
| Grass | `#6AA84F` |
| Forest | `#356B2F` |
| Water | `#3D7BB5` |
| Rock | `#8B9097` |
| Dirt / thatch | `#B08968` |
| Timber / wood | `#8B5A2B` |
| Warm accent (roofs, banners) | `#D9A441` |
| UI dark | `#121A24` |

Overall mood: earthy, sunlit, slightly desaturated; warm midtones, cool shadows.

## Technical targets

- **Tile diamond:** the game tile is **128 × 64 px** (2:1). Generate terrain tiles
  at **2× = 256 × 128** and downscale.
- **Buildings:** generate tall; a 1×1 building should read at roughly **128 px wide
  × ~160 px tall** in-game (generate at 2–3×). State the **tile footprint** (e.g.
  "occupies a 1×1 isometric tile") in each prompt so scale stays consistent.
- The building's **base** should sit on the diamond footprint; its visual anchor is
  the bottom-center of the footprint diamond.
- Always export **transparent PNG**.

## Do / Don't

- ✅ One consistent sun direction (upper-left) on every asset.
- ✅ Flat, parallel isometric projection — not a photographic 3/4 perspective.
- ✅ Simple, chunky, readable forms that stay legible when small.
- ❌ No drop shadows cast across a ground plane (only a small contact shadow).
- ❌ No baked-in grass/dirt tile under the building (the game draws terrain).
- ❌ No text, no UI chrome, no watermark, no frame.

## Naming + drop location

Save exports to `public/assets/`:

- terrain → `public/assets/terrain/<name>.png` (e.g. `grass.png`)
- buildings → `public/assets/buildings/<id>.png` (ids match the registry:
  `forester.png`, `gatherer.png`, `quarry.png`, `toolmaker.png`, `storage.png`,
  `hut.png`, `town_center.png`)
- icons → `public/assets/ui/<resource>.png` (`wood.png`, `stone.png`, `food.png`,
  `tools.png`)

Wiring: set `sprite: "buildings/<id>.png"` on the building def in
`src/engine/buildings/registry.ts` and load it in the entity layer (replaces the
placeholder block).
