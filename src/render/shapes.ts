/**
 * Drawing primitives shared by the terrain, entity and ghost layers:
 * isometric diamonds and extruded "block" buildings, plus colour helpers.
 * Everything draws in world coordinates (the camera container transforms them).
 */

import { Graphics } from "pixi.js";
import { TILE_W, TILE_H, gridToScreen, diamondPoints } from "../engine/iso";
import type { TerrainType } from "../engine/types";
import type { BuildingDef } from "../engine/buildings/registry";

const HALF_W = TILE_W / 2;
const HALF_H = TILE_H / 2;

export const TERRAIN_COLORS: Record<TerrainType, number> = {
  grass: 0x6fa84a,
  forest: 0x4e8c3a,
  water: 0x4a86c0,
  rock: 0x9aa0a6,
  dirt: 0xb7895c,
  sand: 0xd9c89a,
  wetland: 0x5f7d52,
  deposit: 0x8a7a6a,
};

/** Multiply an RGB hex colour by `factor` (<1 darkens, >1 lightens). */
export function shade(color: number, factor: number): number {
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v * factor)));
  return (clamp(r) << 16) | (clamp(g) << 8) | clamp(b);
}

/** Small deterministic 0..1 hash so terrain isn't perfectly flat. */
export function tileNoise(col: number, row: number): number {
  const n = Math.sin(col * 12.9898 + row * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

/** Broad, low-frequency shading so the ground reads as rolling terrain. */
function elevationShade(col: number, row: number): number {
  const e =
    Math.sin(col * 0.23 + 1.7) * Math.cos(row * 0.21 - 0.6) +
    0.5 * Math.sin((col + row) * 0.15);
  return 1 + e * 0.05; // ~0.92 .. 1.08
}

/** Independent 0..1 hash for decoration decisions. */
function hash(col: number, row: number, salt: number): number {
  return tileNoise(col * 2.13 + salt * 7.7, row * 3.07 + salt * 3.3);
}

/**
 * A detailed low-poly terrain tile: two facets (lit from the upper-left) with
 * broad elevation shading + per-tile variation, a soft front-edge shadow for
 * depth, per-type detail (forest/rock/water), and sparse decorations
 * (flowers, tufts, pebbles). Seamless — no full grid stroke.
 */
export function drawPolyTile(
  g: Graphics,
  col: number,
  row: number,
  terrain: TerrainType,
): void {
  const { x: cx, y: cy } = gridToScreen(col, row);
  const T = [cx, cy - HALF_H];
  const R = [cx + HALF_W, cy];
  const B = [cx, cy + HALF_H];
  const L = [cx - HALF_W, cy];
  const base = TERRAIN_COLORS[terrain];
  const v = (0.97 + tileNoise(col, row) * 0.06) * elevationShade(col, row);

  g.poly([T[0], T[1], L[0], L[1], B[0], B[1]]).fill({ color: shade(base, v * 1.05) });
  g.poly([T[0], T[1], R[0], R[1], B[0], B[1]]).fill({ color: shade(base, v * 0.91) });

  // Soft shadow along the two front (south) edges for a hint of tile depth.
  g.moveTo(L[0], L[1])
    .lineTo(B[0], B[1])
    .lineTo(R[0], R[1])
    .stroke({ width: 1.5, color: shade(base, v * 0.6), alpha: 0.28 });

  if (terrain === "forest") drawForestAccent(g, cx, cy, v);
  else if (terrain === "rock") drawRockAccent(g, cx, cy, v);
  else if (terrain === "water") drawWaterAccent(g, cx, cy, col, row);
  else if (terrain === "grass") drawGrassDecor(g, cx, cy, col, row);
  else if (terrain === "dirt") drawDirtDecor(g, cx, cy, col, row);
  else if (terrain === "sand") drawSandDecor(g, cx, cy, col, row);
  else if (terrain === "wetland") drawWetlandDecor(g, cx, cy, col, row);
  else if (terrain === "deposit") drawDepositDecor(g, cx, cy, col, row);
}

function drawSandDecor(g: Graphics, cx: number, cy: number, col: number, row: number): void {
  const hi = 0xeadcae;
  g.ellipse(cx - 8, cy + 1, 12, 2).fill({ color: hi, alpha: 0.5 });
  g.ellipse(cx + 6, cy + 6, 9, 1.6).fill({ color: hi, alpha: 0.4 });
  if (hash(col, row, 4) > 0.7) g.circle(cx + 3, cy - 2, 1.6).fill({ color: 0xbfa878 });
}

function drawWetlandDecor(g: Graphics, cx: number, cy: number, col: number, row: number): void {
  // shallow water glints
  g.ellipse(cx + 6, cy + 4, 10, 2.4).fill({ color: 0x5f8fb0, alpha: 0.5 });
  // reed tufts
  const reed = 0x7faa54;
  for (const [dx, dy] of [
    [-10, 4],
    [-4, -2],
    [4, 6],
  ] as const) {
    if (hash(col + dx, row + dy, 6) < 0.6) continue;
    g.rect(cx + dx, cy + dy - 9, 1.4, 9).fill({ color: reed });
    g.rect(cx + dx + 3, cy + dy - 7, 1.4, 7).fill({ color: reed });
  }
}

function drawDepositDecor(g: Graphics, cx: number, cy: number, col: number, row: number): void {
  // rocky ground + ore specks suggesting a mineable vein
  const d = 0x6f6256;
  g.poly([cx - 14, cy + 3, cx - 6, cy - 6, cx + 2, cy, cx - 4, cy + 7]).fill({ color: d });
  g.poly([cx + 5, cy + 5, cx + 13, cy - 1, cx + 18, cy + 5, cx + 10, cy + 9]).fill({ color: d });
  const ore = hash(col, row, 7) > 0.5 ? 0xc88a4a : 0xb9c2cc; // copper-ish vs tin-ish glint
  g.circle(cx - 7, cy - 1, 2).fill({ color: ore });
  g.circle(cx + 11, cy + 3, 1.8).fill({ color: ore });
  g.circle(cx + 1, cy + 5, 1.5).fill({ color: ore });
}

function drawForestAccent(g: Graphics, cx: number, cy: number, v: number): void {
  const dark = shade(0x35642a, v);
  const mid = shade(0x4f8f3a, v);
  const hi = shade(0x6cab4c, v);
  const trunk = 0x5b4128;
  const spots: Array<[number, number, number]> = [
    [-20, 6, 9],
    [-4, -4, 12],
    [16, 6, 9],
    [4, 14, 8],
    [-11, 15, 7],
  ];
  for (const [dx, dy, r] of spots) {
    g.rect(cx + dx - 1.5, cy + dy + r * 0.4, 3, r * 0.5).fill({ color: trunk });
    g.circle(cx + dx, cy + dy, r).fill({ color: dark });
    g.circle(cx + dx, cy + dy - 1, r * 0.82).fill({ color: mid });
    g.circle(cx + dx - r * 0.32, cy + dy - r * 0.32, r * 0.42).fill({ color: hi });
  }
}

function drawRockAccent(g: Graphics, cx: number, cy: number, v: number): void {
  const d = shade(0x767c83, v);
  const m = shade(0xa6abb1, v);
  const h = shade(0xc6cad0, v);
  // boulder 1
  g.poly([cx - 17, cy + 4, cx - 8, cy - 9, cx + 2, cy - 1, cx - 1, cy + 9, cx - 14, cy + 9]).fill({ color: m });
  g.poly([cx - 17, cy + 4, cx - 8, cy - 9, cx - 10, cy + 4]).fill({ color: d });
  g.poly([cx - 8, cy - 9, cx + 2, cy - 1, cx - 3, cy - 3]).fill({ color: h });
  // boulder 2
  g.poly([cx + 6, cy + 6, cx + 14, cy - 3, cx + 21, cy + 5, cx + 12, cy + 11]).fill({ color: m });
  g.poly([cx + 6, cy + 6, cx + 14, cy - 3, cx + 10, cy + 5]).fill({ color: d });
  g.poly([cx + 14, cy - 3, cx + 21, cy + 5, cx + 16, cy + 1]).fill({ color: h });
  // pebbles
  g.circle(cx - 2, cy + 12, 2).fill({ color: d });
  g.circle(cx + 4, cy + 13, 1.6).fill({ color: d });
}

function drawWaterAccent(g: Graphics, cx: number, cy: number, col: number, row: number): void {
  const deep = 0x3f78b0;
  const hi = 0x77a8da;
  // Slightly darker centre for depth.
  g.ellipse(cx, cy, 34, 16).fill({ color: deep, alpha: 0.35 });
  const a = hash(col, row, 5);
  g.ellipse(cx - 10, cy - 3 + a * 2, 14, 3).fill({ color: hi, alpha: 0.5 });
  g.ellipse(cx + 9, cy + 5 - a * 2, 10, 2.4).fill({ color: hi, alpha: 0.4 });
  g.ellipse(cx + 2, cy - 8, 8, 2).fill({ color: hi, alpha: 0.3 });
}

function drawGrassDecor(g: Graphics, cx: number, cy: number, col: number, row: number): void {
  const d = hash(col, row, 1);
  if (d > 0.86) {
    // little flower cluster
    const petals = [0xf2e6a0, 0xe7f0f5, 0xe6a8c4][Math.floor(hash(col, row, 2) * 3) % 3];
    const pts: Array<[number, number]> = [
      [-6, 4],
      [3, -2],
      [8, 7],
    ];
    for (const [dx, dy] of pts) {
      g.circle(cx + dx, cy + dy, 2.2).fill({ color: petals });
      g.circle(cx + dx, cy + dy, 0.9).fill({ color: 0xd8a23a });
    }
  } else if (d < 0.16) {
    // darker grass tufts
    const blade = 0x4f8a34;
    for (const dx of [-8, -2, 5]) {
      g.poly([cx + dx, cy + 2, cx + dx - 2, cy + 8, cx + dx + 2, cy + 8]).fill({ color: blade });
    }
  }
}

function drawDirtDecor(g: Graphics, cx: number, cy: number, col: number, row: number): void {
  const d = hash(col, row, 3);
  if (d > 0.62) {
    const peb = 0x8f6a44;
    g.ellipse(cx - 7, cy + 2, 3, 2).fill({ color: peb });
    g.ellipse(cx + 5, cy + 6, 2.4, 1.6).fill({ color: peb });
    g.ellipse(cx + 1, cy - 3, 2, 1.4).fill({ color: 0xc79b76 });
  }
}

/**
 * A standing tree prop (drawn in world space, base at cx,cy). `s` scales it and
 * `hue` (0..1) varies the green so a forest isn't uniform. Drawn in the
 * depth-sorted entity layer so it overlaps buildings/other props correctly.
 */
export function drawTreeProp(g: Graphics, cx: number, cy: number, s: number, hue: number): void {
  const baseY = cy + 3 * s;
  // soft contact shadow
  g.ellipse(cx, baseY, 11 * s, 4 * s).fill({ color: 0x000000, alpha: 0.18 });
  // trunk
  g.rect(cx - 2 * s, baseY - 12 * s, 4 * s, 13 * s).fill({ color: 0x6e4a2b });
  const dark = shade(0x2f6b2c, 0.92 + hue * 0.16);
  const mid = shade(0x3c7d33, 0.95 + hue * 0.12);
  const hi = shade(0x59993f, 0.98 + hue * 0.1);
  g.circle(cx, baseY - 24 * s, 13 * s).fill({ color: dark });
  g.circle(cx - 7 * s, baseY - 19 * s, 9.5 * s).fill({ color: mid });
  g.circle(cx + 7 * s, baseY - 19 * s, 9.5 * s).fill({ color: mid });
  g.circle(cx - 3 * s, baseY - 30 * s, 8.5 * s).fill({ color: mid });
  g.circle(cx - 5 * s, baseY - 27 * s, 4.5 * s).fill({ color: hi });
}

/** A faceted rock/mountain prop (base at cx,cy). Bigger `s` reads as a mountain. */
export function drawMountainProp(g: Graphics, cx: number, cy: number, s: number): void {
  const baseY = cy + 5 * s;
  const peakY = baseY - 42 * s;
  const w = 26 * s;
  g.ellipse(cx, baseY, w * 0.8, 5 * s).fill({ color: 0x000000, alpha: 0.18 });
  // two faces (lit from upper-left)
  g.poly([cx, peakY, cx - w, baseY, cx, baseY - 5 * s]).fill({ color: 0x9aa0a6 });
  g.poly([cx, peakY, cx + w, baseY, cx, baseY - 5 * s]).fill({ color: 0x767c83 });
  // a side ridge for shape
  g.poly([cx - w * 0.4, baseY - 16 * s, cx - w * 0.9, baseY, cx - w * 0.2, baseY]).fill({
    color: 0x868c93,
  });
  // snow cap (only on tall peaks)
  if (s > 1.05) {
    g.poly([cx, peakY, cx - 9 * s, peakY + 13 * s, cx, peakY + 9 * s]).fill({ color: 0xeaeff4 });
    g.poly([cx, peakY, cx + 9 * s, peakY + 13 * s, cx, peakY + 9 * s]).fill({ color: 0xd2dae1 });
  }
}

export interface BlockCorners {
  n: [number, number];
  e: [number, number];
  s: [number, number];
  w: [number, number];
  height: number;
}

/** The top rhombus corners of a building footprint + its extruded height. */
export function buildingCorners(def: BuildingDef, col: number, row: number): BlockCorners {
  const { w, h } = def.footprint;
  const ns = gridToScreen(col, row);
  const es = gridToScreen(col + w - 1, row);
  const ss = gridToScreen(col + w - 1, row + h - 1);
  const ws = gridToScreen(col, row + h - 1);
  return {
    n: [ns.x, ns.y - HALF_H],
    e: [es.x + HALF_W, es.y],
    s: [ss.x, ss.y + HALF_H],
    w: [ws.x - HALF_W, ws.y],
    height: 20 + 7 * (w + h),
  };
}

export interface BlockStyle {
  color: number;
  alpha?: number;
  outline?: number;
}

/** Draw an extruded isometric block covering a building footprint. */
export function drawBuildingBlock(
  g: Graphics,
  def: BuildingDef,
  col: number,
  row: number,
  style: BlockStyle,
): void {
  const { n, e, s, w, height } = buildingCorners(def, col, row);
  const alpha = style.alpha ?? 1;
  const up = (p: [number, number]): [number, number] => [p[0], p[1] - height];
  const nU = up(n);
  const eU = up(e);
  const sU = up(s);
  const wU = up(w);

  // Foundation / ground footprint (slightly darker).
  g.poly([n[0], n[1], e[0], e[1], s[0], s[1], w[0], w[1]]).fill({
    color: shade(style.color, 0.45),
    alpha: alpha * 0.9,
  });

  // Left wall (W-S).
  g.poly([w[0], w[1], s[0], s[1], sU[0], sU[1], wU[0], wU[1]]).fill({
    color: shade(style.color, 0.68),
    alpha,
  });
  // Right wall (S-E).
  g.poly([s[0], s[1], e[0], e[1], eU[0], eU[1], sU[0], sU[1]]).fill({
    color: shade(style.color, 0.84),
    alpha,
  });
  // Roof.
  g.poly([nU[0], nU[1], eU[0], eU[1], sU[0], sU[1], wU[0], wU[1]]).fill({
    color: style.color,
    alpha,
  });

  if (style.outline !== undefined) {
    g.poly([nU[0], nU[1], eU[0], eU[1], sU[0], sU[1], wU[0], wU[1]]).stroke({
      width: 2,
      color: style.outline,
      alpha,
    });
  }
}

/** Outline a footprint's ground rhombus (for hover/selection/ghost). */
export function drawFootprintOutline(
  g: Graphics,
  def: BuildingDef,
  col: number,
  row: number,
  color: number,
  alpha = 1,
): void {
  const { n, e, s, w } = buildingCorners(def, col, row);
  g.poly([n[0], n[1], e[0], e[1], s[0], s[1], w[0], w[1]])
    .fill({ color, alpha: alpha * 0.25 })
    .stroke({ width: 2, color, alpha });
}

/** Outline a single tile (hover highlight when not building). */
export function drawTileOutline(g: Graphics, col: number, row: number, color: number): void {
  const { x, y } = gridToScreen(col, row);
  g.poly(diamondPoints(x, y))
    .fill({ color, alpha: 0.18 })
    .stroke({ width: 2, color, alpha: 0.9 });
}
