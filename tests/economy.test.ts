import { describe, it, expect } from "vitest";
import { createGame, placeBuilding } from "../src/engine/world";
import { stepGame } from "../src/engine/tick";
import { tileAt } from "../src/engine/map/generate";
import { housingCapacity, START_POPULATION } from "../src/engine/systems/population";
import { laborDemand, laborRatio } from "../src/engine/systems/production";
import { buyResource, sellResource, TRADE_PRICES } from "../src/engine/economy/trade";

const SEED = 999;

describe("population", () => {
  it("starts with villagers housed by the Town Center", () => {
    const state = createGame(SEED);
    const r = state.regions[0];
    expect(r.population).toBe(START_POPULATION);
    expect(housingCapacity(r)).toBeGreaterThanOrEqual(5);
  });

  it("grows toward capacity while fed and consumes food", () => {
    const state = createGame(SEED);
    const r = state.regions[0];
    r.stock.food = 1000;
    const foodBefore = r.stock.food;
    for (let i = 0; i < 500; i++) stepGame(state);
    expect(r.population).toBeGreaterThan(START_POPULATION);
    expect(r.population).toBeLessThanOrEqual(housingCapacity(r) + 1e-6);
    expect(r.stock.food).toBeLessThan(foodBefore);
  });

  it("shrinks when there is no food", () => {
    const state = createGame(SEED);
    const r = state.regions[0];
    r.stock.food = 0;
    const popBefore = r.population;
    for (let i = 0; i < 200; i++) stepGame(state);
    expect(r.population).toBeLessThan(popBefore);
  });

  it("earns coins (taxes) from fed villagers into the global treasury", () => {
    const state = createGame(SEED);
    state.regions[0].stock.food = 1000;
    const coinsBefore = state.coins;
    for (let i = 0; i < 200; i++) stepGame(state);
    expect(state.coins).toBeGreaterThan(coinsBefore);
  });
});

describe("workforce", () => {
  it("scales production down when workers are scarce", () => {
    const state = createGame(SEED);
    const r = state.regions[0];
    r.population = 1;
    let added = 0;
    for (let row = 0; row < r.map.height && added < 3; row++) {
      for (let col = 0; col < r.map.width && added < 3; col++) {
        const t = tileAt(r.map, col, row);
        if (t && t.terrain === "grass" && !t.buildingId) {
          if (placeBuilding(r, "gatherer", col, row)) added++;
        }
      }
    }
    expect(laborDemand(r)).toBeGreaterThan(1);
    expect(laborRatio(r)).toBeLessThan(1);
    expect(laborRatio(r)).toBeGreaterThan(0);
  });
});

describe("trade", () => {
  it("buys/sells a region's goods for global coins (with spread)", () => {
    const state = createGame(SEED);
    const r = state.regions[0];
    state.coins = 100;
    r.stock.wood = 0;

    expect(buyResource(state, r, "wood", 10)).toBe(true);
    expect(r.stock.wood).toBe(10);
    expect(state.coins).toBe(100 - TRADE_PRICES.wood.buy * 10);

    const coinsAfterBuy = state.coins;
    expect(sellResource(state, r, "wood", 10)).toBe(true);
    expect(r.stock.wood).toBe(0);
    expect(state.coins).toBe(coinsAfterBuy + TRADE_PRICES.wood.sell * 10);
    expect(state.coins).toBeLessThan(100);
  });

  it("rejects unaffordable buys and oversells", () => {
    const state = createGame(SEED);
    const r = state.regions[0];
    state.coins = 0;
    r.stock.tools = 0;
    expect(buyResource(state, r, "tools", 10)).toBe(false);
    expect(sellResource(state, r, "tools", 10)).toBe(false);
  });
});
