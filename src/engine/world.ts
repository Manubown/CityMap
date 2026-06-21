/**
 * World state: regions, construction of a fresh game, placement validation, and
 * the mutations the UI/render layers call. Each Region owns its own map,
 * buildings, stockpile and population; coins are global on GameState.
 *
 * All functions here are pure-ish operations over state — no rendering, no
 * React, no globals — so the same logic can run in tests or on a server.
 */

import type {
  BiomeId,
  BuildingTypeId,
  BuildingInstance,
  GameState,
  GridPos,
  Region,
  RegionKind,
  ResearchState,
  TerrainType,
  WorldCoord,
} from "./types";
import { getBuildingDef, type BuildingDef } from "./buildings/registry";
import { generateMap, tileAt } from "./map/generate";
import { canAfford, emptyStock, spend, startingStock } from "./economy/resources";
import { START_POPULATION } from "./systems/population";

export const STATE_VERSION = 5;

/** Anchor tile uniquely identifies a building within its region. */
function buildingId(col: number, row: number): string {
  return `b_${col}_${row}`;
}

export function getRegion(state: GameState, id: string): Region | undefined {
  return state.regions.find((r) => r.id === id);
}

export function activeRegion(state: GameState): Region {
  return getRegion(state, state.activeRegionId) ?? state.regions[0];
}

/** Every tile covered by a building of `def` anchored at (col,row). */
export function footprintTiles(def: BuildingDef, col: number, row: number): GridPos[] {
  const out: GridPos[] = [];
  for (let dr = 0; dr < def.footprint.h; dr++) {
    for (let dc = 0; dc < def.footprint.w; dc++) {
      out.push({ col: col + dc, row: row + dr });
    }
  }
  return out;
}

function neighbourTiles(def: BuildingDef, col: number, row: number): GridPos[] {
  const inside = new Set(footprintTiles(def, col, row).map((p) => `${p.col},${p.row}`));
  const out: GridPos[] = [];
  for (const p of footprintTiles(def, col, row)) {
    for (const c of [
      { col: p.col + 1, row: p.row },
      { col: p.col - 1, row: p.row },
      { col: p.col, row: p.row + 1 },
      { col: p.col, row: p.row - 1 },
    ]) {
      if (!inside.has(`${c.col},${c.row}`)) out.push(c);
    }
  }
  return out;
}

/** Count tiles of `terrain` adjacent to the footprint in a region. */
export function countAdjacentTerrain(
  region: Region,
  def: BuildingDef,
  col: number,
  row: number,
  terrain: TerrainType,
): number {
  let n = 0;
  for (const p of neighbourTiles(def, col, row)) {
    const t = tileAt(region.map, p.col, p.row);
    if (t && t.terrain === terrain) n++;
  }
  return n;
}

export interface PlacementCheck {
  ok: boolean;
  reason?: string;
}

/** Validate whether `type` can be placed at (col,row) in `region`. */
export function canPlace(
  region: Region,
  type: BuildingTypeId,
  col: number,
  row: number,
  opts: { free?: boolean } = {},
): PlacementCheck {
  const def = getBuildingDef(type);

  for (const p of footprintTiles(def, col, row)) {
    const tile = tileAt(region.map, p.col, p.row);
    if (!tile) return { ok: false, reason: "Off the map" };
    if (tile.buildingId) return { ok: false, reason: "Tile occupied" };
    if (!def.buildableOn.includes(tile.terrain)) {
      return { ok: false, reason: `Can't build on ${tile.terrain}` };
    }
  }

  if (def.recipe?.requiresAdjacent) {
    const { terrain, min } = def.recipe.requiresAdjacent;
    if (countAdjacentTerrain(region, def, col, row, terrain) < min) {
      return { ok: false, reason: `Needs ${terrain} nearby` };
    }
  }

  // Biome gate (region-local). Tech/skill gates are global and checked by the
  // controller/BuildBar before placement (M2/M5).
  if (def.requiresBiome && region.biome !== def.requiresBiome) {
    return { ok: false, reason: `Needs ${def.requiresBiome} biome` };
  }

  if (!opts.free && !canAfford(region.stock, def.cost)) {
    return { ok: false, reason: "Not enough resources" };
  }

  return { ok: true };
}

/** Place a building in a region, mutating it. Returns the instance, or null. */
export function placeBuilding(
  region: Region,
  type: BuildingTypeId,
  col: number,
  row: number,
  opts: { free?: boolean } = {},
): BuildingInstance | null {
  if (!canPlace(region, type, col, row, opts).ok) return null;

  const def = getBuildingDef(type);
  if (!opts.free) spend(region.stock, def.cost);

  const id = buildingId(col, row);
  const instance: BuildingInstance = {
    id,
    type,
    col,
    row,
    progress: 0,
    productivity: 0,
    upgrades: [],
    residents: 0,
    tier: 1,
  };
  region.buildings[id] = instance;
  for (const p of footprintTiles(def, col, row)) {
    const tile = tileAt(region.map, p.col, p.row);
    if (tile) tile.buildingId = id;
  }
  return instance;
}

export function removeBuilding(region: Region, id: string): void {
  const b = region.buildings[id];
  if (!b) return;
  const def = getBuildingDef(b.type);
  for (const p of footprintTiles(def, b.col, b.row)) {
    const tile = tileAt(region.map, p.col, p.row);
    if (tile && tile.buildingId === id) tile.buildingId = null;
  }
  delete region.buildings[id];
}

export function buildingAt(region: Region, col: number, row: number): BuildingInstance | null {
  const tile = tileAt(region.map, col, row);
  if (!tile || !tile.buildingId) return null;
  return region.buildings[tile.buildingId] ?? null;
}

/** Drop a free Town Center at the region centre with its first settlers. */
function foundTownCenter(region: Region): void {
  const cc = Math.floor(region.map.width / 2) - 1;
  const cr = Math.floor(region.map.height / 2) - 1;
  const tc = placeBuilding(region, "town_center", cc, cr, { free: true });
  if (tc) tc.residents = START_POPULATION;
  region.population = START_POPULATION;
}

interface RegionOpts {
  claimed: boolean;
  claimCost: number;
  worldPos: WorldCoord;
  kind: RegionKind;
  biome: BiomeId;
}

function createRegion(id: string, name: string, seed: number, o: RegionOpts): Region {
  const region: Region = {
    id,
    name,
    map: generateMap(seed),
    buildings: {},
    stock: o.claimed ? startingStock() : emptyStock(),
    population: 0,
    claimed: o.claimed,
    claimCost: o.claimCost,
    worldPos: o.worldPos,
    kind: o.kind,
    biome: o.biome,
    discovered: o.claimed,
    mapSeed: seed,
    agents: [],
    agentSeq: 0,
    dayTick: 0,
  };
  if (o.claimed) foundTownCenter(region);
  return region;
}

/** Claim an abandoned region: pay coins, grant starting goods + a Town Center. */
export function claimRegion(state: GameState, regionId: string): boolean {
  const region = getRegion(state, regionId);
  if (!region || region.claimed) return false;
  if (state.coins < region.claimCost) return false;
  state.coins -= region.claimCost;
  region.claimed = true;
  region.stock = startingStock();
  foundTownCenter(region);
  return true;
}

function freshResearch(): ResearchState {
  return { age: 1, points: 0, completed: [], active: null };
}

/** Build a fresh game: a claimed homeland + an abandoned village to expand into. */
export function createGame(seed: number): GameState {
  const homeland = createRegion("r1", "Homeland", seed, {
    claimed: true,
    claimCost: 0,
    worldPos: { q: 0, r: 0 },
    kind: "player",
    biome: "plains",
  });
  const village = createRegion("r2", "Abandoned Village", seed + 1337, {
    claimed: false,
    claimCost: 80,
    worldPos: { q: 1, r: 0 },
    kind: "site",
    biome: "forest",
  });
  return {
    version: STATE_VERSION,
    tick: 0,
    coins: 30,
    regions: [homeland, village],
    activeRegionId: "r1",
    routes: [],
    worldSeed: seed,
    research: freshResearch(),
    skillPoints: 0,
    skillPointsAwarded: 0,
    unlockedSkills: ["root"],
  };
}
