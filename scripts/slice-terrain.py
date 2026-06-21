#!/usr/bin/env python
"""
Slice the Screaming Brain Studios CC0 isometric floor tiles (in art-src/sbs/)
into individual, transparent terrain tiles for CityMap.

The source sheets are grids of 128x64 diamond tiles on a solid black
background. For each chosen tile we crop its 128x64 cell and flood the
border-connected black away (keeping dark detail inside the diamond), then save.

Outputs PNGs into public/assets/terrain/<type>/<i>.png and a variant manifest
to src/render/terrainSprites.json.

Source: "1000+ Isometric Floor Tiles" by Screaming Brain Studios (CC0).
"""

import json
import os
import numpy as np
from scipy import ndimage
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..")
SRC = os.path.join(ROOT, "art-src", "sbs")
OUT = os.path.join(ROOT, "public", "assets", "terrain")
MANIFEST = os.path.join(ROOT, "src", "render", "terrainSprites.json")

CW, CH = 128, 64
BLACK_MAX = 22  # a pixel is "background" if its brightest channel <= this

# Which (sheet, col, row) cells become which terrain type. Cols/rows are tile
# indices within the sheet (128x64 cells).
PICKS = {
    "grass": [("ground", 0, 0), ("ground", 1, 0)],
    "dirt": [("ground", 2, 0), ("ground", 3, 0)],
    "forest": [
        ("forests", 0, 0),
        ("forests", 1, 1),
        ("forests", 2, 2),
        ("forests", 0, 3),
        ("forests", 1, 4),
        ("forests", 2, 5),
    ],
    "rock": [("rocky", 2, 0), ("rocky", 1, 1), ("rocky", 2, 1), ("rocky", 0, 3)],
}

_sheets: dict[str, Image.Image] = {}


def sheet(name: str) -> Image.Image:
    if name not in _sheets:
        _sheets[name] = Image.open(os.path.join(SRC, f"{name}.png")).convert("RGB")
    return _sheets[name]


def cut(name: str, col: int, row: int) -> Image.Image:
    im = sheet(name)
    box = (col * CW, row * CH, col * CW + CW, row * CH + CH)
    rgb = np.asarray(im.crop(box), dtype=np.uint8)

    black = rgb.max(2) <= BLACK_MAX
    lbl, _ = ndimage.label(black)
    border = set(lbl[0, :]) | set(lbl[-1, :]) | set(lbl[:, 0]) | set(lbl[:, -1])
    border.discard(0)
    bg = np.isin(lbl, list(border)) if border else np.zeros_like(black)
    alpha = np.where(bg, 0, 255).astype(np.uint8)

    # Keep the diamond full-size (no erosion) so tiles still tessellate; the
    # renderer overlaps tiles slightly to hide the thin anti-aliased edge.
    return Image.fromarray(np.dstack([rgb, alpha]), "RGBA")


def main():
    manifest: dict[str, list[str]] = {}
    for terrain, cells in PICKS.items():
        os.makedirs(os.path.join(OUT, terrain), exist_ok=True)
        paths = []
        for i, (name, col, row) in enumerate(cells):
            tile = cut(name, col, row)
            rel = f"terrain/{terrain}/{i}.png"
            tile.save(os.path.join(OUT, terrain, f"{i}.png"))
            paths.append(rel)
        manifest[terrain] = paths
        print(f"{terrain:7s} {len(paths)} variants")

    with open(MANIFEST, "w") as f:
        json.dump(manifest, f, indent=2)
    print("manifest ->", os.path.normpath(MANIFEST))


if __name__ == "__main__":
    main()
