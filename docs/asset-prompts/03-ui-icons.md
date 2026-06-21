# UI Icons — nano banana prompts

Resource icons for the HUD and build bar. These are **flat, front-facing** icons
(NOT isometric) — they live in the 2D UI, not the world. Keep them simple, bold,
and readable at ~24–32 px. Generate at **256 × 256 px**, transparent background.

Use the **palette** from `00-style-bible.md`. A subtle rounded soft-shadow under
each icon is fine; no text, no frame.

> Note: Slice 1 ships emoji glyphs as placeholders (🪵 🪨 🍖 🪓). Replace
> `RESOURCES[id].glyph` rendering with these PNGs once generated.

---

### wood.png
```
Flat front-facing game UI icon of WOOD: two stacked cut logs (#8B5A2B) with visible
end-grain rings, slightly rounded, bold and simple. Soft top-left light, subtle
contact shadow. Centered on a fully transparent background. No text, no frame.
Readable at 28 px.
```

### stone.png
```
Flat front-facing game UI icon of STONE: a small pile of grey rock chunks (#8B9097),
chunky faceted shapes, bold and simple. Soft top-left light, subtle contact shadow.
Centered, transparent background, no text, no frame. Readable at 28 px.
```

### food.png
```
Flat front-facing game UI icon of FOOD for a stone-age game: a cooked meat haunch
or a basket of berries (#C0573A), appetizing and simple. Soft top-left light,
subtle contact shadow. Centered, transparent background, no text, no frame.
Readable at 28 px.
```

### tools.png
```
Flat front-facing game UI icon of TOOLS: a stone axe with a wooden handle (#6B7B8C
head, #8B5A2B handle), bold and simple. Soft top-left light, subtle contact shadow.
Centered, transparent background, no text, no frame. Readable at 28 px.
```

---

## Optional UI frames (later)

A 9-slice panel frame and a build-button frame in the UI-dark tone (`#121A24`) with
a thin warm accent border (`#D9A441`) would let us replace the CSS panels with
themed art. Not needed for Slice 1 — the current CSS HUD stands in.
