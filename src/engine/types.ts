/**
 * Core domain types for the CityMap simulation.
 *
 * This module is engine-agnostic: nothing here imports PixiJS or React.
 * The whole simulation is plain data + pure functions so it stays
 * deterministic, testable, and serialisable (for saves and a future server).
 */

/** A tile coordinate on the isometric grid. */
export interface GridPos {
  col: number;
  row: number;
}

/** Per-tile surface kind (paintable + buildable). */
export type TerrainType =
  | "grass"
  | "forest"
  | "water"
  | "rock"
  | "dirt"
  | "sand"
  | "wetland"
  | "deposit";

/**
 * Regional classification that drives which resources are reachable and which
 * extractors are valid. A biome paints its tiles from a terrain palette.
 */
export type BiomeId = "plains" | "forest" | "mountains" | "wetland" | "desert" | "coast";

/**
 * Goods. Base (wood/stone/food/tools) + biome raws (grain/game/reeds/sand/ore)
 * + the bronze chain (copper/tin/bronze/bronze_tools). Stock records are
 * exhaustive over this union, so adding an id is a compile-enforced change.
 */
export type ResourceId =
  | "wood"
  | "stone"
  | "food"
  | "tools"
  | "grain"
  | "game"
  | "reeds"
  | "sand"
  | "ore"
  | "copper"
  | "tin"
  | "bronze"
  | "bronze_tools";

/** Build-menu category, for grouping buildings as the roster grows. */
export type BuildingCategory = "housing" | "food" | "extraction" | "crafting" | "logistics";

/** Region role on the world map. */
export type RegionKind = "player" | "npc" | "site";

/** Axial hex coordinate on the world map. */
export interface WorldCoord {
  q: number;
  r: number;
}

/** Building type identifiers (Stone Age set). */
export type BuildingTypeId =
  | "town_center"
  | "forester"
  | "gatherer"
  | "quarry"
  | "storage"
  | "toolmaker"
  | "market"
  | "hut"
  // biome extractors (M1)
  | "farm"
  | "hunter"
  | "reed_cutter"
  | "sand_pit"
  | "miner"
  // bronze chain (M2)
  | "copper_mine"
  | "tin_mine"
  | "smelter"
  | "bronze_foundry";

/** A single map tile. */
export interface Tile {
  terrain: TerrainType;
  /** Id of the building occupying this tile, or null if empty. */
  buildingId: string | null;
  /** Buried resource on a `deposit` tile (copper/tin/ore), if any. */
  deposit?: ResourceId;
}

/** The playfield: a row-major grid of tiles. */
export interface GameMap {
  width: number; // number of columns
  height: number; // number of rows
  seed: number;
  /** Row-major: tiles[row * width + col]. */
  tiles: Tile[];
}

/** A placed building instance (lightweight; static data lives in the registry). */
export interface BuildingInstance {
  id: string;
  type: BuildingTypeId;
  /** Anchor tile (top corner of the footprint, smallest col/row). */
  col: number;
  row: number;
  /** Production progress in the current cycle, 0..1. */
  progress: number;
  /** Cached productivity (0..1) from the last tick — drives UI + production. */
  productivity: number;
  /** Unlocked skill-tree node ids (per individual building). */
  upgrades: string[];
  /** Residents living here (residential buildings; float, displayed floored). */
  residents: number;
  /** Residential tier (1 = Settlers, 2 = Villagers, 3 = Citizens). */
  tier: number;
}

/** Partial stockpile delta / cost map. */
export type ResourceMap = Partial<Record<ResourceId, number>>;

/**
 * A visible villager agent (M6). A deterministic projection of the aggregate
 * population — agents never own economy. `path` is recomputed on load, never
 * serialized. (Reserved here; behaviour lands in M6.)
 */
export interface Agent {
  id: number;
  role: string;
  col: number;
  row: number;
}

/** An NPC settlement's trading state (M3). Reserved here; behaviour in M3. */
export interface NpcState {
  archetype: string;
  reputation: number;
  /** Complete-by-construction over ResourceId to avoid NaN coins. */
  prices: Record<ResourceId, { buy: number; sell: number }>;
}

/** A region: its own land, buildings, stockpile and population, sited on the world. */
export interface Region {
  id: string;
  name: string;
  map: GameMap;
  buildings: Record<string, BuildingInstance>;
  /** Local stockpile of goods (coins are global on GameState). */
  stock: Record<ResourceId, number>;
  /** Villagers living in this region (float; displayed floored). */
  population: number;
  /** False = an abandoned village/site you can still claim. */
  claimed: boolean;
  /** Coins required to claim it (0 for the starting region). */
  claimCost: number;
  // --- world / biomes / agents (schema reserved in M0a) ---
  /** Position on the world hex map. */
  worldPos: WorldCoord;
  /** player colony, npc settlement, or unclaimed site. */
  kind: RegionKind;
  /** Dominant biome (drives resources + node colour). */
  biome: BiomeId;
  /** Whether the player has discovered this node (fog of war, M3). */
  discovered: boolean;
  /** Seed its map was generated from (for lazy/regenerable maps, M3). */
  mapSeed: number;
  /** Visible villager agents (M6). */
  agents: Agent[];
  /** Monotonic id source for agents. */
  agentSeq: number;
  /** Day-cycle clock for agent schedules (M6). */
  dayTick: number;
  /** NPC trading state when kind === "npc" (M3). */
  npc?: NpcState;
}

/** A standing order that moves one good between two regions each tick. */
export interface TradeRoute {
  id: string;
  fromRegion: string;
  toRegion: string;
  resource: ResourceId;
  /** Units moved per tick (when the source has them). */
  rate: number;
}

/** Global research/tech progression (M2). points spent on the TECHS ladder. */
export interface ResearchState {
  age: number; // 1 = Stone, 2 = Bronze, ...
  points: number;
  completed: string[]; // unlocked tech ids
  active: string | null; // tech currently being researched
}

/** Full serialisable game state. */
export interface GameState {
  version: number;
  tick: number;
  /** Global treasury, earned from taxes across all regions, spent on trade/claims. */
  coins: number;
  regions: Region[];
  activeRegionId: string;
  routes: TradeRoute[];
  /** Master seed for deterministic world generation. */
  worldSeed: number;
  // --- progression (schema reserved in M0a) ---
  /** Tech/age progression (M2). */
  research: ResearchState;
  /** Skill points for the global skill tree (M5). */
  skillPoints: number;
  /** Total SP ever awarded — idempotency guard so saves stay deterministic. */
  skillPointsAwarded: number;
  /** Unlocked skill-tree node ids (empire-wide, M5). */
  unlockedSkills: string[];
}
