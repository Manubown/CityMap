/**
 * Zustand store: the UI-facing mirror of the game. It holds only what the HUD
 * needs to render (resource counts, build mode, selection, hover) plus action
 * slots. The GameController fills the action slots with real implementations
 * and pushes data snapshots in; React components read fields and call actions.
 */

import { create } from "zustand";
import type { BiomeId, BuildingTypeId, GridPos, ResourceId, ResourceMap } from "../engine/types";
import { emptyStock } from "../engine/economy/resources";

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
  buildMode: BuildingTypeId | null;
  hover: GridPos | null;
  selected: SelectedInfo | null;
  message: string | null;
  regions: RegionInfo[];
  activeRegionId: string;
  routes: RouteInfo[];

  // --- actions (replaced by the controller on start) ---
  setBuildMode: (type: BuildingTypeId) => void;
  cancelBuild: () => void;
  deleteSelected: () => void;
  clearSelection: () => void;
  trade: (res: ResourceId, dir: "buy" | "sell") => void;
  upgrade: (nodeId: string) => void;
  switchRegion: (id: string) => void;
  claimRegion: (id: string) => void;
  addRoute: (from: string, to: string, res: ResourceId) => void;
  removeRoute: (id: string) => void;
  save: () => void;
  newGame: () => void;
  togglePause: () => void;
}

const noop = (): void => {};

export const useGameStore = create<GameStore>(() => ({
  stock: emptyStock(),
  coins: 0,
  population: 0,
  capacity: 0,
  laborSupply: 0,
  laborDemand: 0,
  tick: 0,
  buildingCount: 0,
  running: true,
  buildMode: null,
  hover: null,
  selected: null,
  message: null,
  regions: [],
  activeRegionId: "",
  routes: [],

  setBuildMode: noop,
  cancelBuild: noop,
  deleteSelected: noop,
  clearSelection: noop,
  trade: noop,
  upgrade: noop,
  switchRegion: noop,
  claimRegion: noop,
  addRoute: noop,
  removeRoute: noop,
  save: noop,
  newGame: noop,
  togglePause: noop,
}));
