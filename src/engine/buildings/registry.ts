/**
 * Data-driven building registry. Adding content = adding a record here, not
 * writing code. Every building is static data; placed instances live in
 * GameState.buildings (see types.ts).
 */

import type { BiomeId, BuildingTypeId, ResourceMap, TerrainType } from "../types";
import type { UpgradeNode } from "./upgrades";

/** A production recipe: consume inputs -> produce outputs every `cycleTicks`. */
export interface ProductionRecipe {
  inputs: ResourceMap;
  outputs: ResourceMap;
  /** Sim ticks for one full production cycle at 100% productivity. */
  cycleTicks: number;
  /**
   * Optional adjacency requirement. The building is productive only when at
   * least `min` tiles of `terrain` touch its footprint (4-neighbourhood).
   */
  requiresAdjacent?: { terrain: TerrainType; min: number };
}

export interface BuildingDef {
  id: BuildingTypeId;
  name: string;
  description: string;
  age: number;
  /** Footprint in tiles. */
  footprint: { w: number; h: number };
  /** Cost paid once on placement. */
  cost: ResourceMap;
  /** Every footprint tile must be one of these terrains to place. */
  buildableOn: TerrainType[];
  /** Placeholder body colour until a sprite is wired in. */
  color: number;
  /** Sprite path under public/assets/buildings, once art exists. */
  sprite?: string;
  /** Production behaviour; omitted for passive buildings (storage, hut). */
  recipe?: ProductionRecipe;
  /** Villagers this building can house. */
  housing?: number;
  /** Workers needed to run at full productivity (production buildings). */
  workers?: number;
  /** Reuse another building's sprite + manifest entry (e.g. market -> storage). */
  spriteAlias?: BuildingTypeId;
  /** Selecting this building opens the trade panel. */
  trade?: boolean;
  /** Per-building skill tree (each placed instance unlocks nodes individually). */
  upgrades?: UpgradeNode[];
  // --- progression gates (inert until content uses them) ---
  /** Only buildable in regions of this biome (M1). */
  requiresBiome?: BiomeId;
  /** Requires this tech completed (M2). */
  requiresTech?: string;
  /** Requires this global skill-tree node unlocked (M5). */
  requiresSkill?: string;
}

/** Shared upgrade tree for the raw extractors (forester/gatherer/quarry). */
const EXTRACTOR_TREE: UpgradeNode[] = [
  {
    id: "speed1",
    name: "Sharper Tools",
    description: "+25% work speed.",
    cost: { wood: 15 },
    coins: 10,
    effects: { speedMult: 1.25 },
  },
  {
    id: "out1",
    name: "Bigger Crew",
    description: "+50% output per cycle.",
    cost: { wood: 25, tools: 5 },
    coins: 20,
    requires: ["speed1"],
    effects: { outputMult: 1.5 },
  },
  {
    id: "eff1",
    name: "Specialized Labour",
    description: "Needs ~1 fewer worker.",
    cost: { tools: 8 },
    coins: 25,
    requires: ["out1"],
    effects: { workersMult: 0.66 },
  },
];

const TOOLMAKER_TREE: UpgradeNode[] = [
  {
    id: "speed1",
    name: "Better Forge",
    description: "+25% craft speed.",
    cost: { wood: 15 },
    coins: 15,
    effects: { speedMult: 1.25 },
  },
  {
    id: "eff1",
    name: "Material Savings",
    description: "-25% wood per craft.",
    cost: { stone: 10 },
    coins: 20,
    requires: ["speed1"],
    effects: { inputMult: 0.75 },
  },
  {
    id: "out1",
    name: "Master Smith",
    description: "+50% tools output.",
    cost: { tools: 10, stone: 10 },
    coins: 40,
    requires: ["eff1"],
    effects: { outputMult: 1.5 },
  },
];

const HUT_TREE: UpgradeNode[] = [
  {
    id: "house1",
    name: "Extra Room",
    description: "+2 housing.",
    cost: { wood: 10 },
    coins: 5,
    effects: { housingAdd: 2 },
  },
  {
    id: "house2",
    name: "Second Storey",
    description: "+3 more housing.",
    cost: { wood: 20, stone: 5 },
    coins: 15,
    requires: ["house1"],
    effects: { housingAdd: 3 },
  },
  {
    id: "tax1",
    name: "Proud Home",
    description: "+25% taxes here.",
    cost: { tools: 5 },
    coins: 20,
    requires: ["house1"],
    effects: { taxMult: 1.25 },
  },
];

const TOWN_TREE: UpgradeNode[] = [
  {
    id: "house1",
    name: "Expanded Hall",
    description: "+4 housing.",
    cost: { wood: 30, stone: 15 },
    coins: 20,
    effects: { housingAdd: 4 },
  },
  {
    id: "tax1",
    name: "Village Council",
    description: "+30% taxes here.",
    cost: { tools: 10 },
    coins: 40,
    requires: ["house1"],
    effects: { taxMult: 1.3 },
  },
];

const GROUND: TerrainType[] = ["grass", "dirt"];

export const BUILDINGS: Record<BuildingTypeId, BuildingDef> = {
  town_center: {
    id: "town_center",
    name: "Town Center",
    description: "The heart of your settlement. Houses your first villagers.",
    age: 1,
    footprint: { w: 2, h: 2 },
    cost: {},
    buildableOn: GROUND,
    color: 0xd9a441,
    housing: 5,
    upgrades: TOWN_TREE,
  },
  forester: {
    id: "forester",
    name: "Forester's Hut",
    description: "Harvests Wood. Must be built next to forest.",
    age: 1,
    footprint: { w: 1, h: 1 },
    cost: { wood: 10 },
    buildableOn: GROUND,
    color: 0x6b8e23,
    workers: 2,
    upgrades: EXTRACTOR_TREE,
    recipe: {
      inputs: {},
      outputs: { wood: 1 },
      cycleTicks: 8,
      requiresAdjacent: { terrain: "forest", min: 1 },
    },
  },
  gatherer: {
    id: "gatherer",
    name: "Gatherer's Hut",
    description: "Forages Food from the surrounding land.",
    age: 1,
    footprint: { w: 1, h: 1 },
    cost: { wood: 8 },
    buildableOn: GROUND,
    color: 0xb5651d,
    workers: 2,
    upgrades: EXTRACTOR_TREE,
    recipe: {
      inputs: {},
      outputs: { food: 1 },
      cycleTicks: 10,
    },
  },
  quarry: {
    id: "quarry",
    name: "Stone Quarry",
    description: "Extracts Stone. Must be built next to rock.",
    age: 1,
    footprint: { w: 1, h: 1 },
    cost: { wood: 12 },
    buildableOn: GROUND,
    color: 0x8a8d91,
    workers: 3,
    upgrades: EXTRACTOR_TREE,
    recipe: {
      inputs: {},
      outputs: { stone: 1 },
      cycleTicks: 12,
      requiresAdjacent: { terrain: "rock", min: 1 },
    },
  },
  toolmaker: {
    id: "toolmaker",
    name: "Toolmaker",
    description: "Crafts Tools from Wood — the first processing chain.",
    age: 1,
    footprint: { w: 1, h: 1 },
    cost: { wood: 15, stone: 10 },
    buildableOn: GROUND,
    color: 0x4f6d7a,
    workers: 3,
    upgrades: TOOLMAKER_TREE,
    recipe: {
      inputs: { wood: 2 },
      outputs: { tools: 1 },
      cycleTicks: 14,
    },
  },
  storage: {
    id: "storage",
    name: "Storage Hut",
    description: "Stores goods. (Flavour for now; logistics come later.)",
    age: 1,
    footprint: { w: 2, h: 1 },
    cost: { wood: 20 },
    buildableOn: GROUND,
    color: 0xa9744f,
  },
  market: {
    id: "market",
    name: "Trading Post",
    description: "Trade goods for coins with passing merchants. Select it to trade.",
    age: 1,
    footprint: { w: 2, h: 1 },
    cost: { wood: 25, stone: 10 },
    buildableOn: GROUND,
    color: 0xc08a3e,
    spriteAlias: "storage",
    trade: true,
  },
  hut: {
    id: "hut",
    name: "Hut",
    description: "A simple home. Houses villagers — keep them fed.",
    age: 1,
    footprint: { w: 1, h: 1 },
    cost: { wood: 5 },
    buildableOn: GROUND,
    color: 0xc8a165,
    housing: 4,
    upgrades: HUT_TREE,
  },
};

/** Buildings shown in the build bar, in order. Town Center is auto-placed. */
export const BUILDABLE_ORDER: BuildingTypeId[] = [
  "hut",
  "forester",
  "gatherer",
  "quarry",
  "toolmaker",
  "storage",
  "market",
];

export function getBuildingDef(type: BuildingTypeId): BuildingDef {
  return BUILDINGS[type];
}
