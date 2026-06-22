/**
 * Organic city growth (Phase 3): a thriving, near-full city raises new homes on
 * its own — villagers build a Hut (as a construction site the builders finish)
 * whenever housing is nearly full and there's a wood surplus. Self-regulating:
 * it stops when population catches up or wood runs low. Deterministic.
 */

import type { GridPos, Region } from "../types";
import { getBuildingDef } from "../buildings/registry";
import { housingCapacity } from "./population";
import { canPlace, placeBuilding } from "../world";

const GROW_EVERY = 30; // ticks between growth checks
const MAX_SITES = 2; // don't pile up unfinished homes

function findSpot(region: Region): GridPos | null {
  const cc = Math.floor(region.map.width / 2) - 1;
  const cr = Math.floor(region.map.height / 2) - 1;
  const cells: { col: number; row: number; d: number }[] = [];
  for (let row = 0; row < region.map.height; row++) {
    for (let col = 0; col < region.map.width; col++) {
      cells.push({ col, row, d: Math.abs(col - cc) + Math.abs(row - cr) });
    }
  }
  cells.sort((a, b) => a.d - b.d);
  for (const c of cells) {
    if (canPlace(region, "hut", c.col, c.row).ok) return { col: c.col, row: c.row };
  }
  return null;
}

export function stepCityGrowth(region: Region): void {
  if (region.dayTick % GROW_EVERY !== 0) return;
  const cap = housingCapacity(region);
  if (cap <= 0 || region.population < cap * 0.85) return; // only when nearly full

  const hutWood = getBuildingDef("hut").cost.wood ?? 5;
  if (region.stock.wood < hutWood * 2) return; // need a surplus

  let sites = 0;
  for (const b of Object.values(region.buildings)) if (!b.built) sites++;
  if (sites >= MAX_SITES) return;

  const spot = findSpot(region);
  if (!spot) return;
  const b = placeBuilding(region, "hut", spot.col, spot.row); // pays wood from stock
  if (b) {
    b.built = false; // a construction site the builders complete
    b.buildProgress = 0;
  }
}
