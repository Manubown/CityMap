# Stone-Age Buildings — nano banana prompts

Prepend the **STYLE HEADER** from `00-style-bible.md` to each prompt. State the
**tile footprint** in every prompt so all buildings share one scale. The base
should sit on the footprint diamond; anchor = bottom-center of that diamond.

Filenames match the registry ids in `src/engine/buildings/registry.ts`.

---

### town_center.png — occupies a 2×2 isometric tile footprint
```
[STYLE HEADER]
A stone-age TOWN CENTER / tribal gathering place, occupying a 2×2 isometric tile
footprint. A large round communal longhouse with a thatched conical roof, a
central fire pit with a thin wisp of smoke, carved wooden totem posts and a few
hide banners in a warm accent (#D9A441). Sturdy timber and stone base. The heart
of a settlement — a bit grander than the other huts. Single building, centered,
transparent background, small soft contact shadow only.
```

### hut.png — occupies a 1×1 isometric tile footprint
```
[STYLE HEADER]
A simple stone-age HOME hut, occupying a 1×1 isometric tile footprint. A small
round dwelling of timber poles and thatch (#B08968) with a low conical roof and a
small dark doorway. Humble and cozy. Single building, centered, transparent
background, small soft contact shadow only.
```

### forester.png — occupies a 1×1 isometric tile footprint
```
[STYLE HEADER]
A stone-age FORESTER'S HUT, occupying a 1×1 isometric tile footprint. A timber-and
-thatch hut with a wooden drying rack beside it and a neat stack of cut logs
(#8B5A2B), a leaning stone axe. Greenish accents (#6B8E23). Reads as "wood
production". Single building, centered, transparent background, small soft contact
shadow only.
```

### gatherer.png — occupies a 1×1 isometric tile footprint
```
[STYLE HEADER]
A stone-age GATHERER'S HUT, occupying a 1×1 isometric tile footprint. A small hut
with woven baskets of berries and roots out front, drying herbs, a foraging
satchel. Warm earthy tones (#B5651D). Reads as "food gathering". Single building,
centered, transparent background, small soft contact shadow only.
```

### quarry.png — occupies a 1×1 isometric tile footprint
```
[STYLE HEADER]
A stone-age STONE QUARRY, occupying a 1×1 isometric tile footprint. A small dig
site against grey rock (#8B9097): stacked cut stone blocks, a wooden sledge, simple
stone tools, light rock dust. Reads as "stone production". Single building,
centered, transparent background, small soft contact shadow only.
```

### toolmaker.png — occupies a 1×1 isometric tile footprint
```
[STYLE HEADER]
A stone-age TOOLMAKER / knapper's workshop, occupying a 1×1 isometric tile
footprint. An open-sided timber workshop with a workbench, stone axes and spear
heads being shaped, wood shavings, cool slate-blue accents (#4F6D7A). Reads as
"crafting tools from wood". Single building, centered, transparent background,
small soft contact shadow only.
```

### storage.png — occupies a 2×1 isometric tile footprint
```
[STYLE HEADER]
A stone-age STORAGE hut, occupying a 2×1 isometric tile footprint (wider than deep).
A low longhouse-style store of timber and thatch (#A9744F) with stacked baskets,
sacks, clay pots and a couple of cut logs under an overhang. Reads as "goods
storage". Single building, centered, transparent background, small soft contact
shadow only.
```

---

## Consistency checklist (per asset)

- Same upper-left sun on every building? ✅
- Flat 2:1 iso projection (not photographic 3/4)? ✅
- Transparent background, only a small contact shadow, no ground tile? ✅
- Scale matches the stated footprint vs the other buildings? ✅
- Palette within the style bible range? ✅
