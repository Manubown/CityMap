/**
 * Procedural generator for the first region. Deterministic given a seed.
 * Mostly grass, with forest clusters (for Foresters), rock patches (for
 * Quarries), a lake, and a few dirt patches — and a clear buildable area
 * around the centre where the Town Center starts.
 */

import type { GameMap, Tile, TerrainType } from "../types";
import { createRng, type Rng } from "../rng";

export const DEFAULT_MAP_W = 48;
export const DEFAULT_MAP_H = 48;

function idx(width: number, col: number, row: number): number {
  return row * width + col;
}

function inBounds(w: number, h: number, col: number, row: number): boolean {
  return col >= 0 && row >= 0 && col < w && row < h;
}

/** Stamp a rough circular blob of `terrain` around (cc, cr). */
function stampBlob(
  tiles: Tile[],
  w: number,
  h: number,
  cc: number,
  cr: number,
  radius: number,
  terrain: TerrainType,
  rng: Rng,
): void {
  const r2 = radius * radius;
  for (let row = cr - radius; row <= cr + radius; row++) {
    for (let col = cc - radius; col <= cc + radius; col++) {
      if (!inBounds(w, h, col, row)) continue;
      const dc = col - cc;
      const dr = row - cr;
      // Jittered edge so blobs look organic rather than perfectly round.
      const edge = r2 * (0.7 + rng.next() * 0.6);
      if (dc * dc + dr * dr <= edge) {
        tiles[idx(w, col, row)].terrain = terrain;
      }
    }
  }
}

function isCentral(w: number, h: number, col: number, row: number, pad: number): boolean {
  const cc = Math.floor(w / 2);
  const cr = Math.floor(h / 2);
  return Math.abs(col - cc) <= pad && Math.abs(row - cr) <= pad;
}

export function generateMap(
  seed: number,
  width = DEFAULT_MAP_W,
  height = DEFAULT_MAP_H,
): GameMap {
  const rng = createRng(seed);
  const tiles: Tile[] = new Array(width * height);
  for (let i = 0; i < tiles.length; i++) {
    tiles[i] = { terrain: "grass", buildingId: null };
  }

  // A lake, biased away from the centre.
  const lakeEdge = rng.chance(0.5);
  const lakeCol = lakeEdge ? rng.int(2, 8) : rng.int(width - 9, width - 3);
  const lakeRow = rng.int(Math.floor(height * 0.55), height - 4);
  stampBlob(tiles, width, height, lakeCol, lakeRow, rng.int(4, 6), "water", rng);

  // Forest clusters.
  const forestCount = rng.int(5, 8);
  for (let i = 0; i < forestCount; i++) {
    stampBlob(
      tiles,
      width,
      height,
      rng.int(3, width - 4),
      rng.int(3, height - 4),
      rng.int(2, 4),
      "forest",
      rng,
    );
  }

  // Rock patches.
  const rockCount = rng.int(3, 5);
  for (let i = 0; i < rockCount; i++) {
    stampBlob(
      tiles,
      width,
      height,
      rng.int(3, width - 4),
      rng.int(3, height - 4),
      rng.int(1, 3),
      "rock",
      rng,
    );
  }

  // Dirt patches (cosmetic clearings).
  const dirtCount = rng.int(2, 4);
  for (let i = 0; i < dirtCount; i++) {
    stampBlob(
      tiles,
      width,
      height,
      rng.int(2, width - 3),
      rng.int(2, height - 3),
      rng.int(1, 2),
      "dirt",
      rng,
    );
  }

  // Keep a clear, buildable grass apron around the centre for the start city,
  // but leave nearby forest/rock close enough to reach.
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      if (isCentral(width, height, col, row, 3)) {
        tiles[idx(width, col, row)].terrain = "grass";
      }
    }
  }
  // Guarantee a forest and a rock patch within reach of the start.
  const cc = Math.floor(width / 2);
  const cr = Math.floor(height / 2);
  stampBlob(tiles, width, height, cc - 5, cr - 2, 2, "forest", rng);
  stampBlob(tiles, width, height, cc + 5, cr + 2, 2, "rock", rng);

  return { width, height, seed, tiles };
}

export function tileAt(map: GameMap, col: number, row: number): Tile | null {
  if (!inBounds(map.width, map.height, col, row)) return null;
  return map.tiles[idx(map.width, col, row)];
}
