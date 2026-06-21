/**
 * Zustand store: the UI-facing mirror of the game. It holds only what the HUD
 * needs to render (resource counts, build mode, selection, hover) plus action
 * slots. The GameController fills the action slots with real implementations
 * and pushes data snapshots in; React components read fields and call actions.
 */

import { create } from "zustand";
import type {
  BiomeId,
  BuildingTypeId,
  GridPos,
  RegionKind,
  ResourceId,
  ResourceMap,
  WorldCoord,
} from "../engine/types";
import { emptyStock } from "../engine/economy/resources";
import type { SaveSlot } from "../engine/save/persistence";

export interface UpgradeOption {
  id: string;
  name: string;
  description: string;
  cost: ResourceMap;
  coins: number;
  affordable: boolean;
}

export interface SelectedInfo {
  id: string;
  type: BuildingTypeId;
  name: string;
  description: string;
  age: number;
  footprint: { w: number; h: number };
  productivity: number;
  progress: number;
  built: boolean;
  buildProgress: number;
  upgrading?: number; // pending-upgrade progress 0..1, if any
  recipe?: {
    inputs: ResourceMap;
    outputs: ResourceMap;
    cycleTicks: number;
    requiresAdjacent?: { terrain: string; min: number };
  };
  workers?: number;
  housing?: number;
  isMarket: boolean;
  removable: boolean;
  // residential
  isResidence: boolean;
  residents?: number;
  capacity?: number;
  tierName?: string;
  needsKeys?: ResourceId[];
  // skill tree
  ownedUpgrades: string[];
  upgradeOptions: UpgradeOption[];
}

export interface RegionInfo {
  id: string;
  name: string;
  claimed: boolean;
  claimCost: number;
  population: number;
  active: boolean;
  biome: BiomeId;
  kind: RegionKind;
  discovered: boolean;
  worldPos: WorldCoord;
  /** Present for NPC settlements: their reputation + current prices. */
  npc?: { reputation: number; prices: Record<ResourceId, { buy: number; sell: number }> };
}

export type ViewMode = "city" | "strategic" | "skills" | "stats";

export interface FlowInfo {
  id: ResourceId;
  name: string;
  glyph: string;
  stock: number;
  producedPerSec: number;
  consumedPerSec: number;
  netPerSec: number;
}

export interface SkillNodeInfo {
  id: string;
  name: string;
  description: string;
  cost: number;
  pos: { x: number; y: number };
  requires: string[];
  effectLabel: string;
  unlocked: boolean;
  available: boolean;
  affordable: boolean;
}

export interface RouteInfo {
  id: string;
  fromRegion: string;
  toRegion: string;
  fromName: string;
  toName: string;
  resource: ResourceId;
  rate: number;
}

export interface ContractInfo {
  id: string;
  npcId: string;
  resource: ResourceId;
  dir: "buy" | "sell";
  qty: number;
  everyTicks: number;
}

export interface TechInfo {
  id: string;
  name: string;
  description: string;
  cost: number;
  completed: boolean;
  available: boolean;
  affordable: boolean;
}

export interface GameStore {
  // --- data pushed by the controller (active region + global) ---
  stock: Record<ResourceId, number>;
  coins: number;
  population: number;
  capacity: number;
  laborSupply: number;
  laborDemand: number;
  tick: number;
  buildingCount: number;
  running: boolean;
  gameSpeed: number;
  menuOpen: boolean;
  buildMode: BuildingTypeId | null;
  clearMode: boolean;
  infoHidden: boolean;
  hover: GridPos | null;
  selected: SelectedInfo | null;
  message: string | null;
  regions: RegionInfo[];
  activeRegionId: string;
  routes: RouteInfo[];
  contracts: ContractInfo[];
  canTrade: boolean;
  flows: FlowInfo[];
  // time of day / calendar
  timeHour: number;
  timeMinute: number;
  dayNum: number;
  monthNum: number;
  dayOfMonth: number;
  isNight: boolean;
  // research / progression
  age: number;
  ageName: string;
  researchPoints: number;
  completedTechs: string[];
  unlockedSkills: string[];
  techs: TechInfo[];
  skillPoints: number;
  skillNodes: SkillNodeInfo[];
  viewMode: ViewMode;

  // --- actions (replaced by the controller on start) ---
  setView: (v: ViewMode) => void;
  toggleInfo: () => void;
  npcTrade: (npcId: string, res: ResourceId, dir: "buy" | "sell", qty: number) => void;
  setupDeal: (
    npcId: string,
    res: ResourceId,
    dir: "buy" | "sell",
    qty: number,
    everyTicks: number,
  ) => void;
  cancelDeal: (id: string) => void;
  unlockSkill: (id: string) => void;
  setBuildMode: (type: BuildingTypeId) => void;
  cancelBuild: () => void;
  toggleClear: () => void;
  deleteSelected: () => void;
  clearSelection: () => void;
  trade: (res: ResourceId, dir: "buy" | "sell") => void;
  upgrade: (nodeId: string) => void;
  research: (techId: string) => void;
  switchRegion: (id: string) => void;
  claimRegion: (id: string) => void;
  addRoute: (from: string, to: string, res: ResourceId, rate: number) => void;
  removeRoute: (id: string) => void;
  save: () => void;
  newGame: () => void;
  togglePause: () => void;
  setSpeed: (n: number) => void;
  toggleMenu: () => void;
  saveSlot: (slot: SaveSlot) => void;
  loadSlot: (slot: SaveSlot) => void;
}

const noop = (): void => {};

export const useGameStore = create<GameStore>((set) => ({
  stock: emptyStock(),
  coins: 0,
  population: 0,
  capacity: 0,
  laborSupply: 0,
  laborDemand: 0,
  tick: 0,
  buildingCount: 0,
  running: true,
  gameSpeed: 1,
  menuOpen: false,
  buildMode: null,
  clearMode: false,
  infoHidden: false,
  hover: null,
  selected: null,
  message: null,
  regions: [],
  activeRegionId: "",
  routes: [],
  contracts: [],
  canTrade: false,
  flows: [],
  timeHour: 6,
  timeMinute: 0,
  dayNum: 1,
  monthNum: 1,
  dayOfMonth: 1,
  isNight: false,
  age: 1,
  ageName: "Stone Age",
  researchPoints: 0,
  completedTechs: [],
  unlockedSkills: [],
  techs: [],
  skillPoints: 0,
  skillNodes: [],
  viewMode: "city",

  setView: (v) => set({ viewMode: v }),
  toggleInfo: () => set((s) => ({ infoHidden: !s.infoHidden })),
  npcTrade: noop,
  setupDeal: noop,
  cancelDeal: noop,
  unlockSkill: noop,
  setBuildMode: noop,
  cancelBuild: noop,
  toggleClear: noop,
  deleteSelected: noop,
  clearSelection: noop,
  trade: noop,
  upgrade: noop,
  research: noop,
  switchRegion: noop,
  claimRegion: noop,
  addRoute: noop,
  removeRoute: noop,
  save: noop,
  newGame: noop,
  togglePause: noop,
  setSpeed: noop,
  toggleMenu: () => set((s) => ({ menuOpen: !s.menuOpen })),
  saveSlot: noop,
  loadSlot: noop,
}));
