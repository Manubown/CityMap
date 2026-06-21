/**
 * Axial-hex coordinate math for the world map. Regions sit on a hex grid; the
 * player starts at the centre {q:0,r:0} and expands outward through neighbours.
 */

import type { WorldCoord } from "../types";

/** The six axial directions, clockwise. */
export const HEX_DIRS: WorldCoord[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

export function coordKey(c: WorldCoord): string {
  return `${c.q},${c.r}`;
}

/** Deterministic spatial hash for seeding per-node RNG. */
export function hashCoord(c: WorldCoord): number {
  return ((c.q * 73856093) ^ (c.r * 19349663)) >>> 0;
}

export function neighbours(c: WorldCoord): WorldCoord[] {
  return HEX_DIRS.map((d) => ({ q: c.q + d.q, r: c.r + d.r }));
}

export function hexDistance(a: WorldCoord, b: WorldCoord): number {
  return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
}

/** All coords with distance <= radius from the origin (origin first, then rings). */
export function withinRadius(radius: number): WorldCoord[] {
  const out: WorldCoord[] = [];
  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      const c = { q, r };
      if (hexDistance({ q: 0, r: 0 }, c) <= radius) out.push(c);
    }
  }
  // origin first, then by ascending distance for stable, readable ordering
  out.sort((a, b) => hexDistance({ q: 0, r: 0 }, a) - hexDistance({ q: 0, r: 0 }, b));
  return out;
}
