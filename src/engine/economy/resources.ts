/**
 * Resource definitions. Slice 1 keeps a single global stockpile; later this
 * becomes per-warehouse with logistics (see docs/GDD.md).
 */

import type { ResourceId, ResourceMap } from "../types";

export interface ResourceDef {
  id: ResourceId;
  name: string;
  /** Short glyph used as a placeholder icon in the HUD until art lands. */
  glyph: string;
  /** Placeholder tint for icons/buttons. */
  color: number;
}

export const RESOURCES: Record<ResourceId, ResourceDef> = {
  wood: { id: "wood", name: "Wood", glyph: "🪵", color: 0x8b5a2b },
  stone: { id: "stone", name: "Stone", glyph: "🪨", color: 0x9aa0a6 },
  food: { id: "food", name: "Food", glyph: "🍖", color: 0xc0573a },
  tools: { id: "tools", name: "Tools", glyph: "🪓", color: 0x6b7b8c },
  // biome raws (M1)
  grain: { id: "grain", name: "Grain", glyph: "🌾", color: 0xd9b24a },
  game: { id: "game", name: "Game", glyph: "🍗", color: 0xb5651d },
  reeds: { id: "reeds", name: "Reeds", glyph: "🎋", color: 0x6f8f4a },
  sand: { id: "sand", name: "Sand", glyph: "🏖️", color: 0xd9c89a },
  ore: { id: "ore", name: "Ore", glyph: "⛏️", color: 0x8a7a6a },
  // bronze chain (M2)
  copper: { id: "copper", name: "Copper", glyph: "🟠", color: 0xb87333 },
  tin: { id: "tin", name: "Tin", glyph: "⚪", color: 0xb0b0b8 },
  bronze: { id: "bronze", name: "Bronze", glyph: "🟫", color: 0xa3713c },
  bronze_tools: { id: "bronze_tools", name: "Bronze Tools", glyph: "⚒️", color: 0x9c6b3a },
};

/**
 * Resources shown in the HUD bar. Stays the base 4 until M1/M2 reveal the rest
 * (the others exist in stock at 0 but aren't displayed yet).
 */
export const RESOURCE_ORDER: ResourceId[] = ["wood", "stone", "food", "tools"];

/** A stock record with every resource present (avoids undefined -> NaN). */
export function emptyStock(): Record<ResourceId, number> {
  return {
    wood: 0, stone: 0, food: 0, tools: 0,
    grain: 0, game: 0, reeds: 0, sand: 0, ore: 0,
    copper: 0, tin: 0, bronze: 0, bronze_tools: 0,
  };
}

/** Starting stockpile for a fresh region. */
export function startingStock(): Record<ResourceId, number> {
  return { ...emptyStock(), wood: 60, stone: 30, food: 25 };
}

/** True if `stock` can cover every entry in `cost`. */
export function canAfford(stock: Record<ResourceId, number>, cost: ResourceMap): boolean {
  return (Object.keys(cost) as ResourceId[]).every((r) => stock[r] >= (cost[r] ?? 0));
}

/** Subtract `cost` from `stock` in place. Assumes affordability was checked. */
export function spend(stock: Record<ResourceId, number>, cost: ResourceMap): void {
  for (const r of Object.keys(cost) as ResourceId[]) {
    stock[r] -= cost[r] ?? 0;
  }
}

/** Add `delta` to `stock` in place. */
export function deposit(stock: Record<ResourceId, number>, delta: ResourceMap): void {
  for (const r of Object.keys(delta) as ResourceId[]) {
    stock[r] += delta[r] ?? 0;
  }
}

/**
 * Goods that satisfy a villager's "food" need (consumed in this order). Lets
 * every biome have a distinct food source — gathered food, farmed grain, hunted
 * game — all feeding the same population.
 */
export const FOOD_GROUP: ResourceId[] = ["food", "grain", "game"];

/** Total available food across the food group. */
export function totalFood(stock: Record<ResourceId, number>): number {
  return FOOD_GROUP.reduce((s, r) => s + stock[r], 0);
}

/** Consume up to `amount` of food (food -> grain -> game). Returns amount consumed. */
export function consumeFood(stock: Record<ResourceId, number>, amount: number): number {
  let remaining = amount;
  for (const r of FOOD_GROUP) {
    if (remaining <= 0) break;
    const take = Math.min(stock[r], remaining);
    stock[r] -= take;
    remaining -= take;
  }
  return amount - remaining;
}
