# Terrain Tiles — nano banana prompts

Prepend the **STYLE HEADER** from `00-style-bible.md` to each prompt below.

Each tile is a single **isometric diamond** (2:1). Generate at **256 × 128 px**,
transparent outside the diamond. The diamond's top/bottom/left/right points should
touch the canvas edges so tiles align edge-to-edge with no seams. Keep texture
subtle and **tileable** — avoid one big feature that would obviously repeat.

> Tip: generate each terrain as a small set (3–4 variants) so the map isn't visibly
> tiled; the renderer can pick a variant per tile by hash.

---

### grass.png
```
[STYLE HEADER]
A single isometric ground tile of short sunlit GRASS, diamond-shaped (2:1).
Soft, even green (#6AA84F) with gentle tonal variation and a few tiny blades,
no flowers, no rocks. Subtle, seamless, tileable texture. The diamond fills the
frame corner-to-corner; everything outside the diamond is transparent.
```

### forest.png
```
[STYLE HEADER]
A single isometric ground tile representing FOREST: dense green tree canopy
(#356B2F) seen from the iso angle, rounded clumped treetops with soft shadow
between them, filling the diamond. Reads clearly as woodland at small size.
Diamond corner-to-corner, transparent outside.
```

### water.png
```
[STYLE HEADER]
A single isometric WATER tile, diamond-shaped: calm blue water (#3D7BB5) with
soft highlights and very gentle ripples, slightly translucent at the edges.
Tileable so adjacent water tiles blend. Diamond corner-to-corner, transparent
outside.
```

### rock.png
```
[STYLE HEADER]
A single isometric ROCK / stone-outcrop tile: grey rocky ground (#8B9097) with a
couple of chunky boulders and exposed stone, light dust. Reads as a quarryable
rock patch. Diamond corner-to-corner, transparent outside.
```

### dirt.png
```
[STYLE HEADER]
A single isometric DIRT clearing tile: bare warm-brown earth (#B08968) with faint
trodden texture and a few small pebbles, no grass. Tileable. Diamond
corner-to-corner, transparent outside.
```

---

## Optional: edge/transition tiles (later)

For nicer coastlines and forest edges, generate grass↔water and grass↔forest
transition diamonds (the matching half grass, half other terrain, blended across
the diamond). Not needed for Slice 1.
