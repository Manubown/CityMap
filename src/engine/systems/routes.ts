/**
 * Trade routes move one good between two claimed regions each tick. This is the
 * logistics layer that lets a resource-rich colony feed your homeland (and the
 * early seed of inter-region transport — later these gain travel time, capacity,
 * and vehicles; see docs/GDD.md).
 */

import type { GameState, Region, ResourceId } from "../types";
import { getRegion } from "../world";
import { getBuildingDef } from "../buildings/registry";
import { aggregateEffects } from "../buildings/upgrades";

/** Route throughput multiplier for a region (1 + its Wagon Yards, upgraded). */
export function routeCapacity(region: Region): number {
  let cap = 1;
  for (const b of Object.values(region.buildings)) {
    if (!b.built) continue;
    const boost = getBuildingDef(b.type).routeBoost ?? 0;
    if (boost) cap += boost * aggregateEffects(b).routeMult;
  }
  return cap;
}

export function stepRoutes(state: GameState): void {
  for (const route of state.routes) {
    const from = getRegion(state, route.fromRegion);
    const to = getRegion(state, route.toRegion);
    if (!from || !to || !from.claimed || !to.claimed) continue;
    const amount = Math.min(route.rate * routeCapacity(from), from.stock[route.resource]);
    if (amount <= 0) continue;
    from.stock[route.resource] -= amount;
    to.stock[route.resource] += amount;
  }
}

/** A route's id is derived from its endpoints + good, so duplicates collapse. */
function routeId(fromRegion: string, toRegion: string, resource: ResourceId): string {
  return `${fromRegion}->${toRegion}:${resource}`;
}

export function addRoute(
  state: GameState,
  fromRegion: string,
  toRegion: string,
  resource: ResourceId,
  rate: number,
): boolean {
  if (fromRegion === toRegion) return false;
  const id = routeId(fromRegion, toRegion, resource);
  if (state.routes.some((r) => r.id === id)) return false;
  state.routes.push({ id, fromRegion, toRegion, resource, rate });
  return true;
}

export function removeRoute(state: GameState, id: string): void {
  state.routes = state.routes.filter((r) => r.id !== id);
}
