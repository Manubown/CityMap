import { describe, it, expect } from "vitest";
import { createGame, canPlace, claimRegion, placeBuilding } from "../src/engine/world";
import { stepGame } from "../src/engine/tick";
import { tileAt } from "../src/engine/map/generate";
import type { GameMap, GridPos } from "../src/engine/types";

const SEED = 11;

function emptyGrass(map: GameMap): GridPos {
  for (let row = 0; row < map.height; row++) {
    for (let col = 0; col < map.width; col++) {
      const t = tileAt(map, col, row);
      if (t && t.terrain === "grass" && !t.buildingId) return { col, row };
    }
  }
  throw new Error("no grass");
}

describe("M1 biome extractors", () => {
  it("gates extractors by region biome", () => {
    const state = createGame(SEED);
    const plains = state.regions[0]; // plains
    const g = emptyGrass(plains.map);
    expect(canPlace(plains, "farm", g.col, g.row).ok).toBe(true); // plains -> farm
    expect(canPlace(plains, "miner", g.col, g.row).ok).toBe(false); // needs mountains
    expect(canPlace(plains, "hunter", g.col, g.row).ok).toBe(false); // needs forest

    state.coins = 1000;
    claimRegion(state, "r2"); // forest biome
    const forest = state.regions[1];
    const g2 = emptyGrass(forest.map);
    expect(canPlace(forest, "hunter", g2.col, g2.row).ok).toBe(true); // forest -> hunter
    expect(canPlace(forest, "farm", g2.col, g2.row).ok).toBe(false); // needs plains
  });

  it("a Farm produces grain", () => {
    const state = createGame(SEED);
    const r = state.regions[0];
    r.stock.grain = 0;
    const g = emptyGrass(r.map);
    expect(placeBuilding(r, "farm", g.col, g.row)).not.toBeNull();
    for (let i = 0; i < 100; i++) stepGame(state);
    expect(r.stock.grain).toBeGreaterThan(0);
  });
});

describe("M1 food group", () => {
  it("grain alone feeds the population (no plain food)", () => {
    const state = createGame(SEED);
    const r = state.regions[0];
    r.stock.food = 0;
    r.stock.grain = 100;
    const popBefore = r.population;
    for (let i = 0; i < 50; i++) stepGame(state);
    expect(r.population).toBeGreaterThanOrEqual(popBefore); // not starving
    expect(r.stock.grain).toBeLessThan(100); // grain consumed as food
  });
});
