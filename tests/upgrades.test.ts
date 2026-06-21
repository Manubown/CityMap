import { describe, it, expect } from "vitest";
import { createGame, placeBuilding } from "../src/engine/world";
import { stepGame } from "../src/engine/tick";
import { tileAt } from "../src/engine/map/generate";
import { unlockUpgrade } from "../src/engine/buildings/upgrades";
import { capacityOf } from "../src/engine/systems/population";
import type { BuildingInstance, GameMap, GridPos, Region, TerrainType } from "../src/engine/types";

const SEED = 4242;

function townCenter(region: Region): BuildingInstance {
  const tc = Object.values(region.buildings).find((b) => b.type === "town_center");
  if (!tc) throw new Error("no town center");
  return tc;
}

function findGrassAdjacentTo(map: GameMap, terrain: TerrainType): GridPos {
  for (let row = 0; row < map.height; row++) {
    for (let col = 0; col < map.width; col++) {
      const t = tileAt(map, col, row);
      if (!t || t.terrain !== "grass" || t.buildingId) continue;
      const near = [
        [col + 1, row],
        [col - 1, row],
        [col, row + 1],
        [col, row - 1],
      ].some(([c, r]) => tileAt(map, c, r)?.terrain === terrain);
      if (near) return { col, row };
    }
  }
  throw new Error("no grass adjacent to " + terrain);
}

function findEmptyGrass(map: GameMap): GridPos {
  for (let row = 0; row < map.height; row++) {
    for (let col = 0; col < map.width; col++) {
      const t = tileAt(map, col, row);
      if (t && t.terrain === "grass" && !t.buildingId) return { col, row };
    }
  }
  throw new Error("no grass");
}

describe("residential tiers", () => {
  it("a well-supplied residence climbs to a higher tier with more capacity", () => {
    const state = createGame(SEED);
    const r = state.regions[0];
    r.stock.food = 100000;
    r.stock.tools = 100000;
    r.stock.stone = 100000;
    const tc = townCenter(r);
    expect(tc.tier).toBe(1);
    const capBefore = capacityOf(tc);

    for (let i = 0; i < 3000; i++) stepGame(state);

    expect(tc.tier).toBeGreaterThan(1);
    expect(capacityOf(tc)).toBeGreaterThan(capBefore);
  });
});

describe("building skill tree", () => {
  it("a speed upgrade increases what a building produces", () => {
    const run = (withUpgrade: boolean): number => {
      const state = createGame(SEED);
      const r = state.regions[0];
      r.stock.food = 100000;
      const spot = findGrassAdjacentTo(r.map, "forest");
      const f = placeBuilding(r, "forester", spot.col, spot.row)!;
      if (withUpgrade) {
        state.coins = 100;
        r.stock.wood += 100;
        expect(unlockUpgrade(state, r, f.id, "speed1")).toBe(true);
      }
      const startWood = r.stock.wood;
      for (let i = 0; i < 200; i++) stepGame(state);
      return r.stock.wood - startWood;
    };
    expect(run(true)).toBeGreaterThan(run(false));
  });

  it("a housing upgrade raises a residence's capacity", () => {
    const state = createGame(SEED);
    const r = state.regions[0];
    const spot = findEmptyGrass(r.map);
    const h = placeBuilding(r, "hut", spot.col, spot.row)!;
    const before = capacityOf(h);

    state.coins = 100;
    r.stock.wood = 100;
    expect(unlockUpgrade(state, r, h.id, "house1")).toBe(true);
    // upgrades now install over time — not applied until construction finishes
    expect(capacityOf(h)).toBe(before);
    for (let i = 0; i < 40; i++) stepGame(state);
    expect(capacityOf(h)).toBeGreaterThan(before);
  });

  it("rejects an unaffordable upgrade", () => {
    const state = createGame(SEED);
    const r = state.regions[0];
    const spot = findEmptyGrass(r.map);
    const h = placeBuilding(r, "hut", spot.col, spot.row)!;
    state.coins = 0;
    r.stock.wood = 0;
    expect(unlockUpgrade(state, r, h.id, "house1")).toBe(false);
  });
});
