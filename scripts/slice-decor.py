#!/usr/bin/env python
"""
Pick tree + rock props from Rafael Sewa's "Forest" isometric asset pack (the
free Vanilla palette) and copy them, trimmed to their content bounds, into
public/assets/decor/. Writes src/render/decorSprites.json (variant lists).

Source: "Isometric Asset Pack: Forest" by Rafael Sewa (rafaelsewa.itch.io).
License: CC BY-NC-SA 4.0 (NonCommercial). See CREDITS.md.
"""

import json
import os
import re
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..")
SRC = os.path.join(ROOT, "art-src", "AssetPack01_Forest_Sample", "02_Vanilla")
OUT = os.path.join(ROOT, "public", "assets", "decor")
MANIFEST = os.path.join(ROOT, "src", "render", "decorSprites.json")

# Tree styles 1-26 are bare/leafless; 31-50 are the lush green ones. Pick a
# spread of leafy trees + a variety of rocks (by their number in the filename).
GROUPS = [
    ("trees", "Tree", [31, 32, 34, 36, 38, 40, 42, 44, 45, 47, 49, 50]),
    ("rocks", "Rock", [1, 2, 3, 4, 5, 6]),
]


def pick(word: str, nums: list[int]) -> list[str]:
    by_num: dict[int, str] = {}
    for f in os.listdir(SRC):
        if not f.lower().endswith(".png"):
            continue
        m = re.search(rf"_{word}(\d+)\.png$", f, re.I)
        if m:
            by_num[int(m.group(1))] = f
    return [by_num[n] for n in nums if n in by_num]


def main():
    manifest: dict[str, list[str]] = {}
    for key, word, nums in GROUPS:
        outdir = os.path.join(OUT, key)
        os.makedirs(outdir, exist_ok=True)
        paths = []
        for i, f in enumerate(pick(word, nums)):
            im = Image.open(os.path.join(SRC, f)).convert("RGBA")
            bbox = im.getbbox()
            if bbox:
                im = im.crop(bbox)
            im.save(os.path.join(outdir, f"{i}.png"))
            paths.append(f"decor/{key}/{i}.png")
            print(f"{key:6s} {i:2d}  {f}  {im.size}")
        manifest[key] = paths

    with open(MANIFEST, "w") as fp:
        json.dump(manifest, fp, indent=2)
    print("manifest ->", os.path.normpath(MANIFEST))


if __name__ == "__main__":
    main()
