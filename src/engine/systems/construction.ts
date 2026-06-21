/**
 * Construction (build + upgrade times). New buildings start as sites and need
 * builder-work to finish; queued upgrades likewise. Total build capacity = a
 * base builder + the capacity of every Builder's Hut. When there are more sites
 * than capacity, work is shared, so building everywhere at once is slower.
 */

import type { Region } from "../types";
import { getBuildingDef, DEFAULT_BUILD_TICKS } from "../buildings/registry";

const BASE_BUILDERS = 1; // you always have one builder
const UPGRADE_TICKS = 24;

function buildCapacity(region: Region): number {
  let cap = BASE_BUILDERS;
  for (const b of Object.values(region.buildings)) {
    if (b.built) cap += getBuildingDef(b.type).buildCapacity ?? 0;
  }
  return cap;
}

export function stepConstruction(region: Region): void {
  const sites = Object.values(region.buildings).filter((b) => !b.built || b.pendingUpgrade);
  if (sites.length === 0) return;

  const rate = Math.min(1, buildCapacity(region) / sites.length);
  for (const b of sites) {
    if (!b.built) {
      const ticks = getBuildingDef(b.type).buildTicks ?? DEFAULT_BUILD_TICKS;
      b.buildProgress = Math.min(1, b.buildProgress + rate / ticks);
      if (b.buildProgress >= 1) b.built = true;
    } else if (b.pendingUpgrade) {
      b.pendingUpgrade.progress += rate / UPGRADE_TICKS;
      if (b.pendingUpgrade.progress >= 1) {
        b.upgrades.push(b.pendingUpgrade.nodeId);
        b.pendingUpgrade = undefined;
      }
    }
  }
}
