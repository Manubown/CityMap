/**
 * Procedural region generator (M0b). Deterministic given a seed.
 *
 * Each region has a dominant BIOME that sets the terrain palette: plains are
 * grass, forest is woods, mountains are rock + ore deposits, etc. On top of the
 * biome fill we always guarantee an early-game-playable core near the centre —
 * a buildable grass apron plus reachable wood (forest), stone (rock), and both
 * bronze ores (copper + tin deposits) — so any region can run the full Stone ->
 * Bronze chain without waiting on expansion.
 *
 * The RNG call ORDER is fixed; changing it re-rolls every map for a given seed.
 */

import type { BiomeId, GameMap, ResourceId, Tile, TerrainType } from "../types";
import { createRng, type Rng } from "../rng";

export const DEFAULT_MAP_W = 48;
export const DEFAULT_MAP_H = 48;

function idx(width: number, col: number, row: number): number {
  return row * width + col;
}

function inBounds(w: number, h: number, col: number, row: number): boolean {
  return col >= 0 && row >= 0 && col < w && row < h;
}

interface Feature {
  terrain: TerrainType;
  count: [number, number];
  radius: [number, number];
  /** If set, mark stamped tiles as a deposit of this resource. */
  deposit?: ResourceId;
}

interface BiomeGen {
  base: TerrainType;
  features: Feature[];
}

/** Terrain palette per biome: a base fill plus weighted feature blobs. */
const BIOME_GEN: Record<BiomeId, BiomeGen> = {
  plains: {
    base: "grass",
    features: [
      { terrain: "forest", count: [4, 6], radius: [2, 3] },
      { terrain: "rock", count: [2, 4], radius: [1, 2] },
      { terrain: "water", count: [1, 1], radius: [3, 5] },
      { terrain: "dirt", count: [2, 3], radius: [1, 2] },
    ],
  },
  forest: {
    base: "forest",
    features: [
      { terrain: "grass", count: [5, 7], radius: [2, 4] },
      { terrain: "water", count: [1, 2], radius: [2, 4] },
      { terrain: "rock", count: [2, 3], radius: [1, 2] },
      { terrain: "dirt", count: [1, 2], radius: [1, 2] },
    ],
  },
  mountains: {
    base: "rock",
    features: [
      { terrain: "grass", count: [4, 6], radius: [2, 3] },
      { terrain: "forest", count: [2, 3], radius: [1, 2] },
      { terrain: "deposit", count: [3, 5], radius: [1, 2], deposit: "ore" },
      { terrain: "water", count: [1, 1], radius: [2, 3] },
    ],
  },
  wetland: {
    base: "wetland",
    features: [
      { terrain: "water", count: [5, 7], radius: [2, 4] },
      { terrain: "grass", count: [3, 5], radius: [2, 3] },
      { terrain: "forest", count: [1, 2], radius: [1, 2] },
    ],
  },
  desert: {
    base: "sand",
    features: [
      { terrain: "rock", count: [3, 5], radius: [2, 3] },
      { terrain: "grass", count: [2, 3], radius: [1, 2] },
      { terrain: "deposit", count: [2, 3], radius: [1, 2], deposit: "ore" },
      { terrain: "water", count: [1, 1], radius: [1, 2] },
    ],
  },
  coast: {
    base: "grass",
    features: [
      { terrain: "water", count: [4, 6], radius: [3, 5] },
      { terrain: "sand", count: [4, 6], radius: [2, 3] },
      { terrain: "forest", count: [2, 3], radius: [1, 2] },
      { terrain: "rock", count: [1, 2], radius: [1, 2] },
    ],
  },
};

/** Stamp a rough circular blob of `terrain` (and optional deposit) around (cc,cr). */
function stampBlob(
  tiles: Tile[],
  w: number,
  h: number,
  cc: number,
  cr: number,
  radius: number,
  terrain: TerrainType,
  rng: Rng,
  deposit?: ResourceId,
): void {
  const r2 = radius * radius;
  for (let row = cr - radius; row <= cr + radius; row++) {
    for (let col = cc - radius; col <= cc + radius; col++) {
      if (!inBounds(w, h, col, row)) continue;
      const dc = col - cc;
      const dr = row - cr;
      const edge = r2 * (0.7 + rng.next() * 0.6);
      if (dc * dc + dr * dr <= edge) {
        const t = tiles[idx(w, col, row)];
        t.terrain = terrain;
        t.deposit = deposit;
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
  biome: BiomeId = "plains",
  width = DEFAULT_MAP_W,
  height = DEFAULT_MAP_H,
): GameMap {
  const rng = createRng(seed);
  const gen = BIOME_GEN[biome];
  const tiles: Tile[] = new Array(width * height);
  for (let i = 0; i < tiles.length; i++) {
    tiles[i] = { terrain: gen.base, buildingId: null };
  }

  // Biome feature blobs, in declared order (locked).
  for (const f of gen.features) {
    const n = rng.int(f.count[0], f.count[1]);
    for (let i = 0; i < n; i++) {
      const col = rng.int(2, width - 3);
      const row = rng.int(2, height - 3);
      const radius = rng.int(f.radius[0], f.radius[1]);
      stampBlob(tiles, width, height, col, row, radius, f.terrain, rng, f.deposit);
    }
  }

  // Clear a buildable grass apron around the centre for the start city.
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      if (isCentral(width, height, col, row, 3)) {
        const t = tiles[idx(width, col, row)];
        t.terrain = "grass";
        t.deposit = undefined;
      }
    }
  }

  // Guarantee a reachable early-game core near the centre: wood, stone, and
  // BOTH bronze ores, so every region can run the full chain.
  const cc = Math.floor(width / 2);
  const cr = Math.floor(height / 2);
  stampBlob(tiles, width, height, cc - 5, cr - 2, 2, "forest", rng);
  stampBlob(tiles, width, height, cc + 5, cr + 2, 2, "rock", rng);
  stampBlob(tiles, width, height, cc - 4, cr + 4, 1, "deposit", rng, "copper");
  stampBlob(tiles, width, height, cc + 4, cr - 4, 1, "deposit", rng, "tin");

  return { width, height, seed, tiles };
}

export function tileAt(map: GameMap, col: number, row: number): Tile | null {
  if (!inBounds(map.width, map.height, col, row)) return null;
  return map.tiles[idx(map.width, col, row)];
}
