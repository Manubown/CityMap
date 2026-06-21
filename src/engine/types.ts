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

/** Terrain kinds for Slice 1 (Stone Age). */
export type TerrainType = "grass" | "forest" | "water" | "rock" | "dirt";

/** Resources tracked in the global stockpile for Slice 1. */
export type ResourceId = "wood" | "stone" | "food" | "tools";

/** Building type identifiers (Stone Age set). */
export type BuildingTypeId =
  | "town_center"
  | "forester"
  | "gatherer"
  | "quarry"
  | "storage"
  | "toolmaker"
  | "market"
  | "hut";

/** A single map tile. */
export interface Tile {
  terrain: TerrainType;
  /** Id of the building occupying this tile, or null if empty. */
  buildingId: string | null;
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

/** A claimable region: its own land, buildings, stockpile and population. */
export interface Region {
  id: string;
  name: string;
  map: GameMap;
  buildings: Record<string, BuildingInstance>;
  /** Local stockpile of goods (coins are global on GameState). */
  stock: Record<ResourceId, number>;
  /** Villagers living in this region (float; displayed floored). */
  population: number;
  /** False = an abandoned village you can still claim. */
  claimed: boolean;
  /** Coins required to claim it (0 for the starting region). */
  claimCost: number;
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

/** Full serialisable game state. */
export interface GameState {
  version: number;
  tick: number;
  /** Global treasury, earned from taxes across all regions, spent on trade/claims. */
  coins: number;
  regions: Region[];
  activeRegionId: string;
  routes: TradeRoute[];
}
