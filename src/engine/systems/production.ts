/**
 * ProductionSystem: advances every producing building in a region one tick.
 *
 * Productivity is gated by adjacency and by labour (workers drawn from the
 * region's villager pool); per-building skill-tree effects then modify the
 * effective cycle speed, output, input cost and worker requirement. Operates on
 * a single Region's buildings + stock.
 */

import type { Region, ResourceMap, ResourceId } from "../types";
import { getBuildingDef } from "../buildings/registry";
import { aggregateEffects } from "../buildings/upgrades";
import { canAfford, deposit, spend } from "../economy/resources";
import { countAdjacentDeposit, countAdjacentTerrain } from "../world";
import { emptySkillEffects, type SkillEffects } from "../skills/skilltree";

function scaleMap(map: ResourceMap, factor: number): ResourceMap {
  const out: ResourceMap = {};
  for (const r of Object.keys(map) as ResourceId[]) out[r] = (map[r] ?? 0) * factor;
  return out;
}

/** Total workers demanded by all production buildings in the region. */
export function laborDemand(region: Region): number {
  let demand = 0;
  for (const b of Object.values(region.buildings)) {
    const def = getBuildingDef(b.type);
    if (def.recipe) demand += (def.workers ?? 0) * aggregateEffects(b).workersMult;
  }
  return demand;
}

/** Fraction of worker demand the region's population can satisfy (0..1). */
export function laborRatio(region: Region): number {
  const demand = laborDemand(region);
  if (demand <= 0) return 1;
  return Math.min(1, Math.floor(region.population) / demand);
}

function adjacencyMet(region: Region, id: string): boolean {
  const b = region.buildings[id];
  const def = getBuildingDef(b.type);
  const recipe = def.recipe;
  if (!recipe) return true;
  if (recipe.requiresAdjacent) {
    const { terrain, min } = recipe.requiresAdjacent;
    if (countAdjacentTerrain(region, def, b.col, b.row, terrain) < min) return false;
  }
  if (recipe.requiresDepositAdjacent) {
    if (countAdjacentDeposit(region, def, b.col, b.row, recipe.requiresDepositAdjacent) < 1) {
      return false;
    }
  }
  return true;
}

export function stepProduction(region: Region, skill: SkillEffects = emptySkillEffects()): void {
  const labor = laborRatio(region);

  for (const id of Object.keys(region.buildings)) {
    const b = region.buildings[id];
    const recipe = getBuildingDef(b.type).recipe;
    if (!recipe) {
      b.productivity = 0;
      continue;
    }

    const productivity = adjacencyMet(region, id) ? labor : 0;
    b.productivity = productivity;
    if (productivity <= 0) continue;

    const eff = aggregateEffects(b);
    const effCycle = recipe.cycleTicks / eff.speedMult;
    b.progress += productivity / effCycle;

    while (b.progress >= 1) {
      const inputs = scaleMap(recipe.inputs, eff.inputMult);
      if (!canAfford(region.stock, inputs)) {
        b.progress = 1;
        break;
      }
      spend(region.stock, inputs);
      deposit(region.stock, scaleMap(recipe.outputs, eff.outputMult * skill.productionMult));
      b.progress -= 1;
    }
  }
}
