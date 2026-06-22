/**
 * Data-driven building registry. Adding content = adding a record here, not
 * writing code. Every building is static data; placed instances live in
 * GameState.buildings (see types.ts).
 */

import type {
  BiomeId,
  BuildingCategory,
  BuildingTypeId,
  ResourceId,
  ResourceMap,
  ServiceType,
  TerrainType,
} from "../types";
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
  /** Must be adjacent to a `deposit` tile carrying this buried resource (mines). */
  requiresDepositAdjacent?: ResourceId;
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
  /** Ticks of builder-work to construct (default DEFAULT_BUILD_TICKS). */
  buildTicks?: number;
  /** Build capacity this building provides (Builder's Hut). */
  buildCapacity?: number;
  /** Trade-route throughput this building adds to its region (Wagon Yard). */
  routeBoost?: number;
  /** Public service this building provides to the city (gates tier growth). */
  service?: ServiceType;
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

const WAGON_TREE: UpgradeNode[] = [
  {
    id: "wagon1",
    name: "Bigger Carts",
    description: "Trade routes from this city carry +50% more.",
    cost: { wood: 30, tools: 5 },
    coins: 25,
    effects: { routeMult: 1.5 },
  },
  {
    id: "wagon2",
    name: "Paved Roads",
    description: "Another +50% route throughput.",
    cost: { stone: 40, tools: 10 },
    coins: 45,
    requires: ["wagon1"],
    effects: { routeMult: 1.5 },
  },
  {
    id: "wagon3",
    name: "Freight Wagons",
    description: "Another +50% route throughput.",
    cost: { wood: 60, tools: 20 },
    coins: 80,
    requires: ["wagon2"],
    effects: { routeMult: 1.5 },
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
  farm: {
    id: "farm",
    name: "Farm",
    description: "Grows Grain on the plains — efficient food.",
    age: 1,
    footprint: { w: 1, h: 1 },
    cost: { wood: 10 },
    buildableOn: GROUND,
    color: 0xc9a227,
    workers: 2,
    requiresBiome: "plains",
    spriteAlias: "gatherer",
    upgrades: EXTRACTOR_TREE,
    recipe: { inputs: {}, outputs: { grain: 1 }, cycleTicks: 9 },
  },
  hunter: {
    id: "hunter",
    name: "Hunter's Lodge",
    description: "Hunts Game in the forest — food from the wild.",
    age: 1,
    footprint: { w: 1, h: 1 },
    cost: { wood: 10 },
    buildableOn: GROUND,
    color: 0x8a5a2b,
    workers: 2,
    requiresBiome: "forest",
    spriteAlias: "forester",
    upgrades: EXTRACTOR_TREE,
    recipe: { inputs: {}, outputs: { game: 1 }, cycleTicks: 11 },
  },
  reed_cutter: {
    id: "reed_cutter",
    name: "Reed Cutter",
    description: "Harvests Reeds from the wetlands.",
    age: 1,
    footprint: { w: 1, h: 1 },
    cost: { wood: 8 },
    buildableOn: ["grass", "dirt", "wetland"],
    color: 0x6f8f4a,
    workers: 2,
    requiresBiome: "wetland",
    spriteAlias: "gatherer",
    upgrades: EXTRACTOR_TREE,
    recipe: { inputs: {}, outputs: { reeds: 1 }, cycleTicks: 10 },
  },
  sand_pit: {
    id: "sand_pit",
    name: "Sand Pit",
    description: "Digs Sand in the desert.",
    age: 1,
    footprint: { w: 1, h: 1 },
    cost: { wood: 10 },
    buildableOn: ["grass", "dirt", "sand"],
    color: 0xd9c89a,
    workers: 2,
    requiresBiome: "desert",
    spriteAlias: "quarry",
    upgrades: EXTRACTOR_TREE,
    recipe: { inputs: {}, outputs: { sand: 1 }, cycleTicks: 10 },
  },
  miner: {
    id: "miner",
    name: "Miner",
    description: "Mines Ore from the mountains.",
    age: 1,
    footprint: { w: 1, h: 1 },
    cost: { wood: 15 },
    buildableOn: ["grass", "dirt", "rock"],
    color: 0x8a7a6a,
    workers: 3,
    requiresBiome: "mountains",
    spriteAlias: "quarry",
    upgrades: EXTRACTOR_TREE,
    recipe: { inputs: {}, outputs: { ore: 1 }, cycleTicks: 12 },
  },
  copper_mine: {
    id: "copper_mine",
    name: "Copper Mine",
    description: "Mines Copper from a copper deposit. Needs Prospecting.",
    age: 1,
    footprint: { w: 1, h: 1 },
    cost: { wood: 15, stone: 10 },
    buildableOn: ["grass", "dirt", "rock"],
    color: 0xb87333,
    workers: 3,
    requiresTech: "prospecting",
    spriteAlias: "quarry",
    upgrades: EXTRACTOR_TREE,
    recipe: { inputs: {}, outputs: { copper: 1 }, cycleTicks: 12, requiresDepositAdjacent: "copper" },
  },
  tin_mine: {
    id: "tin_mine",
    name: "Tin Mine",
    description: "Mines Tin from a tin deposit. Needs Prospecting.",
    age: 1,
    footprint: { w: 1, h: 1 },
    cost: { wood: 15, stone: 10 },
    buildableOn: ["grass", "dirt", "rock"],
    color: 0xb0b0b8,
    workers: 3,
    requiresTech: "prospecting",
    spriteAlias: "quarry",
    upgrades: EXTRACTOR_TREE,
    recipe: { inputs: {}, outputs: { tin: 1 }, cycleTicks: 12, requiresDepositAdjacent: "tin" },
  },
  smelter: {
    id: "smelter",
    name: "Smelter",
    description: "Smelts Copper + Tin into Bronze. Needs Smelting.",
    age: 1,
    footprint: { w: 1, h: 1 },
    cost: { wood: 20, stone: 20 },
    buildableOn: GROUND,
    color: 0xa3713c,
    workers: 3,
    requiresTech: "smelting",
    spriteAlias: "toolmaker",
    upgrades: TOOLMAKER_TREE,
    recipe: { inputs: { copper: 1, tin: 1 }, outputs: { bronze: 1 }, cycleTicks: 16 },
  },
  bronze_foundry: {
    id: "bronze_foundry",
    name: "Bronze Foundry",
    description: "Forges Bronze Tools from Bronze. Needs Bronze Working.",
    age: 1,
    footprint: { w: 1, h: 1 },
    cost: { wood: 25, stone: 15 },
    buildableOn: GROUND,
    color: 0x9c6b3a,
    workers: 3,
    requiresTech: "bronze_working",
    spriteAlias: "toolmaker",
    upgrades: TOOLMAKER_TREE,
    recipe: { inputs: { bronze: 1 }, outputs: { bronze_tools: 1 }, cycleTicks: 18 },
  },
  bloomery: {
    id: "bloomery",
    name: "Bloomery",
    description: "Smelts Ore into Iron. Needs Iron Working.",
    age: 3,
    footprint: { w: 1, h: 1 },
    cost: { wood: 25, stone: 25 },
    buildableOn: GROUND,
    color: 0x8a8f98,
    workers: 4,
    requiresTech: "iron_working",
    spriteAlias: "toolmaker",
    upgrades: TOOLMAKER_TREE,
    recipe: { inputs: { ore: 1 }, outputs: { iron: 1 }, cycleTicks: 20 },
  },
  blacksmith: {
    id: "blacksmith",
    name: "Blacksmith",
    description: "Forges Iron Tools from Iron. Needs Blacksmithing.",
    age: 3,
    footprint: { w: 1, h: 1 },
    cost: { wood: 30, stone: 20 },
    buildableOn: GROUND,
    color: 0x787e87,
    workers: 4,
    requiresTech: "blacksmithing",
    spriteAlias: "toolmaker",
    upgrades: TOOLMAKER_TREE,
    recipe: { inputs: { iron: 1 }, outputs: { iron_tools: 1 }, cycleTicks: 22 },
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
  well: {
    id: "well",
    name: "Well",
    description: "Clean water. Homes need it to grow past Settlers.",
    age: 1,
    footprint: { w: 1, h: 1 },
    cost: { wood: 10, stone: 15 },
    buildableOn: GROUND,
    color: 0x6fa8c9,
    spriteAlias: "storage",
    service: "water",
  },
  tavern: {
    id: "tavern",
    name: "Tavern",
    description: "Food, drink and company. Homes need it to grow into Citizens.",
    age: 1,
    footprint: { w: 2, h: 1 },
    cost: { wood: 30, stone: 10 },
    buildableOn: GROUND,
    color: 0xc08a3e,
    spriteAlias: "storage",
    service: "leisure",
  },
  market_square: {
    id: "market_square",
    name: "Market Square",
    description: "Access to goods. Homes need it to grow into Townsfolk.",
    age: 1,
    footprint: { w: 2, h: 1 },
    cost: { wood: 25, stone: 25 },
    buildableOn: GROUND,
    color: 0xd9a441,
    spriteAlias: "storage",
    service: "market",
  },
  builder_hut: {
    id: "builder_hut",
    name: "Builder's Hut",
    description: "Houses builders — speeds up construction and upgrades across the city.",
    age: 1,
    footprint: { w: 1, h: 1 },
    cost: { wood: 15, stone: 5 },
    buildableOn: GROUND,
    color: 0xb98a52,
    spriteAlias: "storage",
    buildCapacity: 2,
    buildTicks: 16,
  },
  wagon_yard: {
    id: "wagon_yard",
    name: "Wagon Yard",
    description: "Boosts this city's trade routes. Upgrade its levels to transport more.",
    age: 1,
    footprint: { w: 2, h: 1 },
    cost: { wood: 30, stone: 15 },
    buildableOn: GROUND,
    color: 0x9c6f3e,
    spriteAlias: "storage",
    routeBoost: 1,
    upgrades: WAGON_TREE,
  },
};

/** Buildings shown in the build bar, in order. Town Center is auto-placed. */
export const BUILDABLE_ORDER: BuildingTypeId[] = [
  "hut",
  "well",
  "tavern",
  "market_square",
  "gatherer",
  "farm",
  "hunter",
  "forester",
  "quarry",
  "reed_cutter",
  "sand_pit",
  "miner",
  "copper_mine",
  "tin_mine",
  "toolmaker",
  "smelter",
  "bronze_foundry",
  "bloomery",
  "blacksmith",
  "builder_hut",
  "wagon_yard",
  "storage",
  "market",
];

/** Build-menu category per building (for grouping the build bar). */
export const BUILDING_CATEGORY: Record<BuildingTypeId, BuildingCategory> = {
  town_center: "housing",
  hut: "housing",
  well: "services",
  tavern: "services",
  market_square: "services",
  gatherer: "food",
  farm: "food",
  hunter: "food",
  forester: "extraction",
  quarry: "extraction",
  reed_cutter: "extraction",
  sand_pit: "extraction",
  miner: "extraction",
  copper_mine: "extraction",
  tin_mine: "extraction",
  toolmaker: "crafting",
  smelter: "crafting",
  bronze_foundry: "crafting",
  bloomery: "crafting",
  blacksmith: "crafting",
  storage: "logistics",
  market: "logistics",
  builder_hut: "logistics",
  wagon_yard: "logistics",
};

/** Default ticks to construct a building if its def doesn't specify. */
export const DEFAULT_BUILD_TICKS = 28;

export const CATEGORY_ORDER: BuildingCategory[] = [
  "housing",
  "services",
  "food",
  "extraction",
  "crafting",
  "logistics",
];

export function getBuildingDef(type: BuildingTypeId): BuildingDef {
  return BUILDINGS[type];
}
