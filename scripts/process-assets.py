#!/usr/bin/env python
"""
Turn the nano-banana PNGs (opaque white background) into game-ready sprites:

  1. Remove the white background -> real transparency. We only delete white
     pixels that are CONNECTED to the image border (flood from edges via
     connected components), so light highlights *inside* the sprite are kept.
  2. Erode the alpha 1px to kill the anti-aliased white fringe.
  3. Auto-crop to the opaque bounding box and downscale.
  4. Detect each sprite's "ground axis" — the widest opaque row in the lower
     half — which is the isometric base line we anchor to the tile grid.

Outputs PNGs into public/assets/** and a manifest the renderer reads for
per-sprite anchor + intrinsic size.
"""

import json
import os
import numpy as np
from scipy import ndimage
from PIL import Image, ImageFilter

SRC = "/Users/manubown/Programming/Git/images/assets"
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "assets")
MANIFEST = os.path.join(os.path.dirname(__file__), "..", "src", "render", "spriteManifest.json")

# The nano background is a flat grey (~225) plus a warm "god-ray" (bright,
# slightly saturated) and a grey drop-shadow gradient. Treat a pixel as
# background if it's very bright OR a light desaturated grey — then keep only
# the regions connected to the image border so interior highlights survive.
BG_BRIGHT = 200   # max channel above this => background (white/ray/light)
BG_GREY_SAT = 16  # saturation below this ...
BG_GREY_MIN = 115 # ... and min channel above this => light grey bg/shadow

# Terrain is rendered as vector low-poly tiles (see src/render/shapes.ts), so we
# only process building + icon sprites here.
BUILDINGS = ["town_center", "hut", "forester", "gatherer", "quarry", "toolmaker", "storage"]
ICONS = {"wood": "wood", "stone": "stone", "food": "meat", "tools": "axe"}


def strip_white(im):
    rgb = np.asarray(im.convert("RGB"), dtype=np.uint8)
    a = rgb.astype(np.int16)
    mn = a.min(2)
    mx = a.max(2)
    sat = mx - mn
    bgmask = (mx > BG_BRIGHT) | ((sat < BG_GREY_SAT) & (mn > BG_GREY_MIN))

    # Keep only background regions connected to the border (true background);
    # this protects bright/grey pixels enclosed inside the sprite.
    lbl, n = ndimage.label(bgmask)
    border = set(lbl[0, :]) | set(lbl[-1, :]) | set(lbl[:, 0]) | set(lbl[:, -1])
    border.discard(0)
    bg = np.isin(lbl, list(border)) if border else np.zeros_like(bgmask)
    alpha = np.where(bg, 0, 255).astype(np.uint8)

    out = Image.fromarray(np.dstack([rgb, alpha]), "RGBA")
    # Erode alpha 1px -> removes the anti-aliased halo at the cut edge.
    a_img = out.split()[3].filter(ImageFilter.MinFilter(3))

    # Drop stray opaque islands (the god-ray, speckles): keep the largest blob.
    fg = np.asarray(a_img) > 30
    flbl, fn = ndimage.label(fg)
    if fn > 1:
        sizes = np.bincount(flbl.ravel())
        sizes[0] = 0
        keep = sizes.argmax()
        cleaned = np.where(flbl == keep, np.asarray(a_img), 0).astype(np.uint8)
        a_img = Image.fromarray(cleaned)

    out.putalpha(a_img)
    return out


def fit(im, max_side):
    w, h = im.size
    s = max_side / max(w, h)
    if s < 1:
        im = im.resize((max(1, round(w * s)), max(1, round(h * s))), Image.LANCZOS)
    return im


def ground_axis(im):
    """
    The isometric base line = the widest opaque row in the lower half. Returns
    its vertical ratio (anchorY), the row's horizontal centroid ratio (anchorX),
    and the row's opaque width in px (baseW) used to scale to the tile grid.
    """
    a = np.asarray(im.split()[3])
    h, w = a.shape
    op = a > 40
    widths = op.sum(1)
    lo = int(h * 0.45)
    gy = lo + int(np.argmax(widths[lo:]))
    xs = np.where(op[gy])[0]
    base_w = int(op[gy].sum())
    cx = float(xs.mean()) if xs.size else w / 2
    return round(gy / h, 4), round(cx / w, 4), base_w


def process(src_path, out_path, max_side):
    im = Image.open(src_path)
    im = strip_white(im)
    bbox = im.getbbox()
    if bbox:
        im = im.crop(bbox)
    im = fit(im, max_side)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    im.save(out_path)
    return im


def main():
    manifest = {"buildings": {}, "icons": {}}

    for bid in BUILDINGS:
        im = process(f"{SRC}/buildings/v2/{bid}.png", f"{OUT}/buildings/{bid}.png", 384)
        ay, ax, bw = ground_axis(im)
        manifest["buildings"][bid] = {"w": im.width, "h": im.height, "anchorX": ax, "anchorY": ay, "baseW": bw}
        print(f"building {bid:12s} {im.width}x{im.height} anchor=({ax},{ay}) baseW={bw}")

    for rid, name in ICONS.items():
        im = process(f"{SRC}/ui/{name}.png", f"{OUT}/ui/{rid}.png", 128)
        manifest["icons"][rid] = {"w": im.width, "h": im.height}
        print(f"icon     {rid:12s} {im.width}x{im.height}")

    with open(MANIFEST, "w") as f:
        json.dump(manifest, f, indent=2)
    print("manifest ->", os.path.normpath(MANIFEST))


if __name__ == "__main__":
    main()
