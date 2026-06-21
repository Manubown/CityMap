/**
 * Living villagers (M6). A deterministic, COSMETIC projection of a region's
 * population: it spawns one walking agent per resident (capped), gives each a
 * home + (optional) workplace, and runs a daily commute schedule. It never reads
 * or writes the economy — population/production remain the single source of
 * truth — so the sim stays identical whether or not agents are simulated.
 */

import type { Agent, BuildingInstance, GridPos, Region } from "../types";
import { getBuildingDef } from "../buildings/registry";
import { tileAt } from "../map/generate";
import { nextStep } from "./pathfind";
import { dayFraction } from "../time";

export const DAY_LENGTH = 240; // ticks per day-cycle (~60s at TICK_RATE 4)
export const AGENT_CAP = 60; // villagers shown per region
const MOVE_TICKS = 3; // sim ticks to cross one tile
export const MOVE_STEP = 1 / MOVE_TICKS;

function homesOf(region: Region): BuildingInstance[] {
  return Object.values(region.buildings).filter(
    (b) => (getBuildingDef(b.type).housing ?? 0) > 0 || b.type === "town_center",
  );
}

function worksOf(region: Region): BuildingInstance[] {
  return Object.values(region.buildings).filter((b) => !!getBuildingDef(b.type).recipe);
}

function walkable(region: Region, col: number, row: number): boolean {
  const t = tileAt(region.map, col, row);
  return !!t && t.terrain !== "water";
}

/** A small deterministic "stroll" target near home for workless residents. */
function wanderDest(region: Region, a: Agent, home: BuildingInstance): GridPos {
  const ox = (a.id % 7) - 3;
  const oy = ((a.id * 3) % 7) - 3;
  const c = Math.max(0, Math.min(region.map.width - 1, home.col + ox));
  const r = Math.max(0, Math.min(region.map.height - 1, home.row + oy));
  return walkable(region, c, r) ? { col: c, row: r } : { col: home.col, row: home.row };
}

function syncCount(region: Region): void {
  const homes = homesOf(region);
  if (homes.length === 0) {
    region.agents.length = 0;
    return;
  }
  const works = worksOf(region);
  const target = Math.min(AGENT_CAP, Math.floor(region.population));
  while (region.agents.length > target) region.agents.pop();
  while (region.agents.length < target) {
    const id = region.agentSeq++;
    const home = homes[id % homes.length];
    const work = works.length ? works[id % works.length] : null;
    region.agents.push({
      id,
      role: work ? work.type : "resident",
      homeId: home.id,
      workId: work ? work.id : null,
      col: home.col,
      row: home.row,
      ncol: home.col,
      nrow: home.row,
      progress: 0,
      state: "home",
    });
  }
}

function advance(region: Region, a: Agent, workTime: boolean): void {
  const home = region.buildings[a.homeId];
  if (!home) return; // home demolished — freeze (despawned next sync if pop drops)
  const work = a.workId ? region.buildings[a.workId] : null;

  if (a.state === "home" && workTime) a.state = "toWork";
  else if (a.state === "working" && !workTime) a.state = "toHome";

  const dest: GridPos | null =
    a.state === "toWork"
      ? work
        ? { col: work.col, row: work.row }
        : wanderDest(region, a, home)
      : a.state === "toHome"
        ? { col: home.col, row: home.row }
        : null;

  a.progress += MOVE_STEP;
  if (a.progress < 1) return;

  a.col = a.ncol;
  a.row = a.nrow;
  a.progress = 0;

  if (dest && a.col === dest.col && a.row === dest.row) {
    if (a.state === "toWork") a.state = "working";
    else if (a.state === "toHome") a.state = "home";
    a.ncol = a.col;
    a.nrow = a.row;
    return;
  }
  if (dest) {
    const step = nextStep(region.map, { col: a.col, row: a.row }, dest);
    a.ncol = step ? step.col : a.col;
    a.nrow = step ? step.row : a.row;
  } else {
    a.ncol = a.col;
    a.nrow = a.row;
  }
}

export function stepAgents(region: Region): void {
  region.dayTick = (region.dayTick + 1) % DAY_LENGTH;
  syncCount(region);
  // Work during daylight (~07:00–19:00), sleep at home through the night.
  const f = dayFraction(region.dayTick);
  const workTime = f > 0.28 && f < 0.8;
  for (const a of region.agents) advance(region, a, workTime);
}
