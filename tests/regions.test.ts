import { describe, it, expect } from "vitest";
import { createGame, claimRegion } from "../src/engine/world";
import { addRoute } from "../src/engine/systems/routes";
import { stepGame } from "../src/engine/tick";

const SEED = 7;

describe("regions", () => {
  it("claiming requires coins and founds a Town Center", () => {
    const state = createGame(SEED);
    const village = state.regions[1];
    expect(village.claimed).toBe(false);

    state.coins = 0;
    expect(claimRegion(state, village.id)).toBe(false);

    state.coins = village.claimCost + 10;
    expect(claimRegion(state, village.id)).toBe(true);
    expect(village.claimed).toBe(true);
    expect(Object.values(village.buildings).some((b) => b.type === "town_center")).toBe(true);
    expect(village.population).toBeGreaterThan(0);
    expect(state.coins).toBe(10);
  });

  it("a trade route moves goods between regions each tick", () => {
    const state = createGame(SEED);
    const home = state.regions[0];
    const village = state.regions[1];
    state.coins = 1000;
    claimRegion(state, village.id);

    home.stock.wood = 100;
    village.stock.wood = 0;
    expect(addRoute(state, home.id, village.id, "wood", 0.5)).toBe(true);
    expect(addRoute(state, home.id, village.id, "wood", 0.5)).toBe(false); // duplicate

    const homeBefore = home.stock.wood;
    for (let i = 0; i < 50; i++) stepGame(state);

    expect(village.stock.wood).toBeGreaterThan(0);
    expect(home.stock.wood).toBeLessThan(homeBefore);
  });
});
