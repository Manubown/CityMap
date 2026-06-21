/**
 * Per-building skill trees. Each building TYPE defines an upgrade tree (in the
 * registry); each placed building INSTANCE unlocks nodes individually. Effects
 * aggregate multiplicatively (speed/output/input/workers/tax) or additively
 * (housing) and are applied by the production + population systems.
 */

import type { BuildingInstance, GameState, Region, ResourceMap } from "../types";
import { getBuildingDef } from "./registry";
import { canAfford, spend } from "../economy/resources";

export interface UpgradeEffects {
  speedMult?: number; // production speed (shorter cycle)
  outputMult?: number; // output per cycle
  inputMult?: number; // input per cycle (<1 saves materials)
  workersMult?: number; // worker requirement (<1 needs fewer)
  housingAdd?: number; // extra resident capacity
  taxMult?: number; // tax multiplier (residences)
}

export interface UpgradeNode {
  id: string;
  name: string;
  description: string;
  cost: ResourceMap;
  coins?: number;
  requires?: string[];
  effects: UpgradeEffects;
}

export interface AggregatedEffects {
  speedMult: number;
  outputMult: number;
  inputMult: number;
  workersMult: number;
  housingAdd: number;
  taxMult: number;
}

export function emptyEffects(): AggregatedEffects {
  return { speedMult: 1, outputMult: 1, inputMult: 1, workersMult: 1, housingAdd: 0, taxMult: 1 };
}

/** Combine the effects of every upgrade a building has unlocked. */
export function aggregateEffects(b: BuildingInstance): AggregatedEffects {
  const tree = getBuildingDef(b.type).upgrades ?? [];
  const eff = emptyEffects();
  for (const node of tree) {
    if (!b.upgrades.includes(node.id)) continue;
    const e = node.effects;
    if (e.speedMult) eff.speedMult *= e.speedMult;
    if (e.outputMult) eff.outputMult *= e.outputMult;
    if (e.inputMult) eff.inputMult *= e.inputMult;
    if (e.workersMult) eff.workersMult *= e.workersMult;
    if (e.housingAdd) eff.housingAdd += e.housingAdd;
    if (e.taxMult) eff.taxMult *= e.taxMult;
  }
  return eff;
}

/** Nodes that can be unlocked next (prereqs met, not yet owned). */
export function availableUpgrades(b: BuildingInstance): UpgradeNode[] {
  const tree = getBuildingDef(b.type).upgrades ?? [];
  return tree.filter(
    (n) => !b.upgrades.includes(n.id) && (n.requires ?? []).every((r) => b.upgrades.includes(r)),
  );
}

export function canUnlock(
  region: Region,
  coins: number,
  b: BuildingInstance,
  node: UpgradeNode,
): boolean {
  if (!b.built || b.pendingUpgrade) return false; // must be finished, one upgrade at a time
  if (b.upgrades.includes(node.id)) return false;
  if (!(node.requires ?? []).every((r) => b.upgrades.includes(r))) return false;
  if (!canAfford(region.stock, node.cost)) return false;
  if ((node.coins ?? 0) > coins) return false;
  return true;
}

/**
 * Purchase an upgrade (region pays goods, treasury pays coins). The effect does
 * not apply immediately — it's queued as a pendingUpgrade that the construction
 * system installs over time (builder-gated).
 */
export function unlockUpgrade(
  state: GameState,
  region: Region,
  buildingId: string,
  nodeId: string,
): boolean {
  const b = region.buildings[buildingId];
  if (!b) return false;
  const node = (getBuildingDef(b.type).upgrades ?? []).find((n) => n.id === nodeId);
  if (!node || !canUnlock(region, state.coins, b, node)) return false;
  spend(region.stock, node.cost);
  state.coins -= node.coins ?? 0;
  b.pendingUpgrade = { nodeId, progress: 0 };
  return true;
}
