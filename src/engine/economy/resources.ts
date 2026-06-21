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
};

export const RESOURCE_ORDER: ResourceId[] = ["wood", "stone", "food", "tools"];

/** Starting stockpile for a fresh game. */
export function startingStock(): Record<ResourceId, number> {
  return { wood: 60, stone: 30, food: 25, tools: 0 };
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
