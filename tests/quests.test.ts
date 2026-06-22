import { describe, it, expect } from "vitest";
import { createGame } from "../src/engine/world";
import { stepQuests } from "../src/engine/quests";
import { stepCityGrowth } from "../src/engine/systems/cityGrowth";

describe("objective quests", () => {
  it("completes a quest and pays its reward", () => {
    const s = createGame(5);
    s.research.age = 2; // satisfies the "Bronze Age" quest
    const coinsBefore = s.coins;
    stepQuests(s);
    expect(s.completedQuests).toContain("bronze_age");
    expect(s.coins).toBeGreaterThan(coinsBefore);
  });

  it("a building-reward quest raises a building", () => {
    const s = createGame(5);
    const r = s.regions[0];
    r.population = 8; // satisfies "A Growing Village" -> reward includes a Hut
    const before = Object.keys(r.buildings).length;
    stepQuests(s);
    expect(s.completedQuests).toContain("grow_village");
    expect(Object.keys(r.buildings).length).toBeGreaterThan(before);
  });

  it("doesn't re-complete or double-pay a quest", () => {
    const s = createGame(5);
    s.research.age = 3;
    stepQuests(s);
    const coins = s.coins;
    const completed = s.completedQuests.length;
    stepQuests(s);
    expect(s.completedQuests.length).toBe(completed);
    expect(s.coins).toBe(coins);
  });
});

describe("organic city growth", () => {
  it("a full city raises new homes on its own", () => {
    const s = createGame(5);
    const r = s.regions[0];
    r.population = 1000; // well over capacity
    r.stock.wood = 1000;
    r.dayTick = 0; // growth checks fire on a 30-tick cadence
    const before = Object.keys(r.buildings).length;
    stepCityGrowth(r);
    expect(Object.keys(r.buildings).length).toBeGreaterThan(before);
  });
});
