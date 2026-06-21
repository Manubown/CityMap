/**
 * Derived statistics: per-resource production vs consumption rates for a region,
 * including building recipes, population needs, trade routes and NPC contracts.
 * Pure + read-only — used to drive the stats window and the low/deficit warnings.
 */

import type { GameState, Region, ResourceId } from "./types";
import { getBuildingDef } from "./buildings/registry";
import { aggregateEffects } from "./buildings/upgrades";
import { tierOf } from "./systems/population";
import { routeCapacity } from "./systems/routes";
import { getRegion } from "./world";
import { aggregateSkillEffects } from "./skills/skilltree";
import { RESOURCES } from "./economy/resources";

export interface ResourceFlow {
  produced: number; // per tick
  consumed: number; // per tick
}

export function resourceFlows(state: GameState, region: Region): Record<ResourceId, ResourceFlow> {
  const flows = {} as Record<ResourceId, ResourceFlow>;
  for (const id of Object.keys(RESOURCES) as ResourceId[]) flows[id] = { produced: 0, consumed: 0 };
  const prodMult = aggregateSkillEffects(state).productionMult;

  for (const b of Object.values(region.buildings)) {
    if (!b.built) continue;
    const def = getBuildingDef(b.type);

    if (def.recipe && b.productivity > 0) {
      const eff = aggregateEffects(b);
      const cyclesPerTick = b.productivity / (def.recipe.cycleTicks / eff.speedMult);
      for (const r of Object.keys(def.recipe.outputs) as ResourceId[]) {
        flows[r].produced += cyclesPerTick * (def.recipe.outputs[r] ?? 0) * eff.outputMult * prodMult;
      }
      for (const r of Object.keys(def.recipe.inputs) as ResourceId[]) {
        flows[r].consumed += cyclesPerTick * (def.recipe.inputs[r] ?? 0) * eff.inputMult;
      }
    }

    if (def.housing) {
      const needs = tierOf(b).needs;
      for (const r of Object.keys(needs) as ResourceId[]) {
        flows[r].consumed += b.residents * (needs[r] ?? 0);
      }
    }
  }

  // Trade routes move goods between your regions (scaled by Wagon Yards).
  for (const rt of state.routes) {
    if (rt.fromRegion === region.id) {
      flows[rt.resource].consumed += rt.rate * routeCapacity(region);
    }
    if (rt.toRegion === region.id) {
      const from = getRegion(state, rt.fromRegion);
      flows[rt.resource].produced += rt.rate * (from ? routeCapacity(from) : 1);
    }
  }

  // Standing NPC deals.
  for (const c of state.contracts) {
    if (c.regionId !== region.id) continue;
    const rate = c.qty / c.everyTicks;
    if (c.dir === "sell") flows[c.resource].consumed += rate;
    else flows[c.resource].produced += rate;
  }

  return flows;
}
