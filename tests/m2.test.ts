import { describe, it, expect } from "vitest";
import { createGame, placeBuilding, canPlace } from "../src/engine/world";
import { stepGame } from "../src/engine/tick";
import { tileAt } from "../src/engine/map/generate";
import { completeTech, canResearch } from "../src/engine/research/techs";
import type { GameMap, GridPos } from "../src/engine/types";

const SEED = 11;

function neighbours(c: number, r: number): [number, number][] {
  return [
    [c + 1, r],
    [c - 1, r],
    [c, r + 1],
    [c, r - 1],
  ];
}

/** An empty grass tile adjacent to a copper deposit. */
function copperMineSpot(map: GameMap): GridPos {
  for (let row = 0; row < map.height; row++) {
    for (let col = 0; col < map.width; col++) {
      const t = tileAt(map, col, row);
      if (t?.deposit !== "copper") continue;
      for (const [c, r] of neighbours(col, row)) {
        const n = tileAt(map, c, r);
        if (n && n.terrain === "grass" && !n.buildingId) return { col: c, row: r };
      }
    }
  }
  throw new Error("no copper mine spot");
}

/** An empty grass tile with no copper deposit neighbour. */
function farFromCopper(map: GameMap): GridPos {
  for (let row = 0; row < map.height; row++) {
    for (let col = 0; col < map.width; col++) {
      const t = tileAt(map, col, row);
      if (!t || t.terrain !== "grass" || t.buildingId) continue;
      if (neighbours(col, row).every(([c, r]) => tileAt(map, c, r)?.deposit !== "copper")) {
        return { col, row };
      }
    }
  }
  throw new Error("no spot");
}

function emptyGrass(map: GameMap): GridPos {
  for (let row = 0; row < map.height; row++) {
    for (let col = 0; col < map.width; col++) {
      const t = tileAt(map, col, row);
      if (t && t.terrain === "grass" && !t.buildingId) return { col, row };
    }
  }
  throw new Error("no grass");
}

describe("M2 research", () => {
  it("completes techs in prerequisite order and advances the Age", () => {
    const state = createGame(SEED);
    expect(canResearch(state, "smelting")).toBe(false); // prereq missing
    state.research.points = 1000;
    expect(completeTech(state, "prospecting")).toBe(true);
    expect(state.research.completed).toContain("prospecting");
    expect(canResearch(state, "smelting")).toBe(true);
    completeTech(state, "smelting");
    expect(completeTech(state, "bronze_working")).toBe(true);
    expect(state.research.age).toBe(2);
  });

  it("accrues research points from population over time", () => {
    const state = createGame(SEED);
    state.regions[0].stock.food = 100000;
    const before = state.research.points;
    for (let i = 0; i < 100; i++) stepGame(state);
    expect(state.research.points).toBeGreaterThan(before);
  });
});

describe("M2 bronze chain", () => {
  it("a Copper Mine needs a copper deposit nearby", () => {
    const state = createGame(SEED);
    const r = state.regions[0];
    expect(canPlace(r, "copper_mine", copperMineSpot(r.map).col, copperMineSpot(r.map).row).ok).toBe(
      true,
    );
    const away = farFromCopper(r.map);
    expect(canPlace(r, "copper_mine", away.col, away.row).ok).toBe(false);
  });

  it("a Smelter turns copper + tin into bronze", () => {
    const state = createGame(SEED);
    const r = state.regions[0];
    r.stock.copper = 100;
    r.stock.tin = 100;
    r.stock.food = 100000;
    const spot = emptyGrass(r.map);
    expect(placeBuilding(r, "smelter", spot.col, spot.row)).not.toBeNull();
    for (let i = 0; i < 200; i++) stepGame(state);
    expect(r.stock.bronze).toBeGreaterThan(0);
    expect(r.stock.copper).toBeLessThan(100);
  });
});
