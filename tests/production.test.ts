import { describe, it, expect } from "vitest";
import { createGame, placeBuilding } from "../src/engine/world";
import { stepGame } from "../src/engine/tick";
import { tileAt } from "../src/engine/map/generate";
import type { GameMap, GridPos, TerrainType } from "../src/engine/types";

const SEED = 12345;

function findGrassAdjacentTo(map: GameMap, terrain: TerrainType): GridPos | null {
  for (let row = 0; row < map.height; row++) {
    for (let col = 0; col < map.width; col++) {
      const t = tileAt(map, col, row);
      if (!t || t.terrain !== "grass" || t.buildingId) continue;
      const hasNeighbour = [
        [col + 1, row],
        [col - 1, row],
        [col, row + 1],
        [col, row - 1],
      ].some(([c, r]) => tileAt(map, c, r)?.terrain === terrain);
      if (hasNeighbour) return { col, row };
    }
  }
  return null;
}

function findEmptyGrass(map: GameMap): GridPos | null {
  for (let row = 0; row < map.height; row++) {
    for (let col = 0; col < map.width; col++) {
      const t = tileAt(map, col, row);
      if (t && t.terrain === "grass" && !t.buildingId) return { col, row };
    }
  }
  return null;
}

describe("production system", () => {
  it("a forester next to forest produces wood", () => {
    const state = createGame(SEED);
    const r = state.regions[0];
    r.stock.food = 1000;
    const spot = findGrassAdjacentTo(r.map, "forest");
    expect(spot).not.toBeNull();

    const inst = placeBuilding(r, "forester", spot!.col, spot!.row);
    expect(inst).not.toBeNull();

    const woodAfterBuild = r.stock.wood;
    for (let i = 0; i < 100; i++) stepGame(state);

    expect(r.buildings[inst!.id].productivity).toBeGreaterThan(0);
    expect(r.stock.wood).toBeGreaterThan(woodAfterBuild);
  });

  it("rejects a forester with no forest nearby", () => {
    const state = createGame(SEED);
    const r = state.regions[0];
    let placed = false;
    for (let row = 2; row < r.map.height - 2 && !placed; row++) {
      for (let col = 2; col < r.map.width - 2 && !placed; col++) {
        const t = tileAt(r.map, col, row);
        if (!t || t.terrain !== "grass" || t.buildingId) continue;
        const forestNear = [
          [col + 1, row],
          [col - 1, row],
          [col, row + 1],
          [col, row - 1],
        ].some(([c, rr]) => tileAt(r.map, c, rr)?.terrain === "forest");
        if (forestNear) continue;
        expect(placeBuilding(r, "forester", col, row)).toBeNull();
        placed = true;
      }
    }
    expect(placed).toBe(true);
  });

  it("the toolmaker turns wood into tools (2-step chain)", () => {
    const state = createGame(SEED);
    const r = state.regions[0];
    r.stock.wood = 200;
    r.stock.food = 1000;
    const spot = findEmptyGrass(r.map);
    expect(spot).not.toBeNull();

    const inst = placeBuilding(r, "toolmaker", spot!.col, spot!.row);
    expect(inst).not.toBeNull();

    const woodBefore = r.stock.wood;
    for (let i = 0; i < 200; i++) stepGame(state);

    expect(r.stock.tools).toBeGreaterThan(0);
    expect(r.stock.wood).toBeLessThan(woodBefore);
  });

  it("is deterministic for the same seed and inputs", () => {
    const run = () => {
      const state = createGame(SEED);
      const r = state.regions[0];
      r.stock.food = 1000;
      const spot = findGrassAdjacentTo(r.map, "forest")!;
      placeBuilding(r, "forester", spot.col, spot.row);
      for (let i = 0; i < 80; i++) stepGame(state);
      return r.stock;
    };
    expect(run()).toEqual(run());
  });
});
