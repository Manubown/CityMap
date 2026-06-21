/**
 * PopulationSystem (tiered, Anno-style), per region.
 *
 * Each residence holds residents at a TIER with a needs basket consumed per
 * resident per tick: Settlers (Food) -> Villagers (Food+Tools) -> Citizens
 * (Food+Tools+Stone). Fed houses grow and pay taxes; if comfort goods are also
 * met near capacity they upgrade a tier; no food shrinks them and decays tiers.
 *
 * stepPopulation operates on one Region (its buildings/stock/population) and
 * RETURNS the coins earned this tick — the caller adds it to the global treasury.
 */

import type { Region, BuildingInstance, ResourceId, ResourceMap } from "../types";
import { getBuildingDef } from "../buildings/registry";
import { aggregateEffects } from "../buildings/upgrades";
import { consumeFood, totalFood } from "../economy/resources";

export const POP_GROWTH = 0.03;
export const POP_STARVE = 0.025;
export const START_POPULATION = 4;
const UPGRADE_STASH = 8;

export interface TierDef {
  id: number;
  name: string;
  capacityMult: number;
  tax: number;
  needs: ResourceMap;
}

export const TIERS: TierDef[] = [
  { id: 1, name: "Settlers", capacityMult: 1.0, tax: 0.02, needs: { food: 0.012 } },
  { id: 2, name: "Villagers", capacityMult: 1.6, tax: 0.035, needs: { food: 0.012, tools: 0.004 } },
  {
    id: 3,
    name: "Citizens",
    capacityMult: 2.4,
    tax: 0.05,
    needs: { food: 0.013, tools: 0.005, stone: 0.003 },
  },
];

export function tierOf(b: BuildingInstance): TierDef {
  return TIERS[Math.min(Math.max(b.tier - 1, 0), TIERS.length - 1)];
}

export function capacityOf(b: BuildingInstance): number {
  const def = getBuildingDef(b.type);
  if (!def.housing) return 0;
  const eff = aggregateEffects(b);
  return (def.housing + eff.housingAdd) * tierOf(b).capacityMult;
}

export function housingCapacity(region: Region): number {
  let cap = 0;
  for (const b of Object.values(region.buildings)) {
    if (getBuildingDef(b.type).housing) cap += capacityOf(b);
  }
  return cap;
}

const comfortKeys = (tier: TierDef): ResourceId[] =>
  (Object.keys(tier.needs) as ResourceId[]).filter((r) => r !== "food");

function nextTierFeasible(region: Region, b: BuildingInstance): boolean {
  const next = TIERS[b.tier];
  if (!next) return false;
  return comfortKeys(next).every((r) => region.stock[r] >= UPGRADE_STASH);
}

/** Advance a region's population one tick; returns coins (taxes) earned. */
export function stepPopulation(region: Region): number {
  let total = 0;
  let coins = 0;

  for (const b of Object.values(region.buildings)) {
    const def = getBuildingDef(b.type);
    if (!def.housing) continue;

    const eff = aggregateEffects(b);
    const tier = tierOf(b);
    const cap = (def.housing + eff.housingAdd) * tier.capacityMult;
    const foodNeed = b.residents * (tier.needs.food ?? 0);

    if (totalFood(region.stock) >= foodNeed) {
      consumeFood(region.stock, foodNeed);

      let comfortMet = true;
      for (const r of comfortKeys(tier)) {
        const need = b.residents * (tier.needs[r] ?? 0);
        if (region.stock[r] >= need) region.stock[r] -= need;
        else comfortMet = false;
      }

      if (comfortMet) {
        if (b.residents < cap) b.residents = Math.min(cap, b.residents + POP_GROWTH);
        coins += b.residents * tier.tax * eff.taxMult;
        if (b.tier < TIERS.length && b.residents >= cap * 0.9 && nextTierFeasible(region, b)) {
          b.tier++;
        }
      } else {
        coins += b.residents * tier.tax * eff.taxMult * 0.5;
        if (b.tier > 1) b.residents = Math.max(0, b.residents - POP_GROWTH * 0.5);
      }
    } else {
      consumeFood(region.stock, totalFood(region.stock)); // eat whatever's left
      b.residents = Math.max(0, b.residents - POP_STARVE);
      if (b.tier > 1) {
        const prevCap = (def.housing + eff.housingAdd) * TIERS[b.tier - 2].capacityMult;
        if (b.residents <= prevCap * 0.5) b.tier--;
      }
    }

    total += b.residents;
  }

  region.population = total;
  return coins;
}
