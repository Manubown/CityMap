import { describe, it, expect } from "vitest";
import { createGame } from "../src/engine/world";
import { stepGame } from "../src/engine/tick";
import {
  unlockSkill,
  canUnlockSkill,
  aggregateSkillEffects,
} from "../src/engine/skills/skilltree";
import { BUILDINGS, BUILDABLE_ORDER } from "../src/engine/buildings/registry";
import type { BuildingTypeId } from "../src/engine/types";

describe("M5 skill points", () => {
  it("accrues SP from population and stays idempotent across a save/reload", () => {
    const cont = createGame(5);
    cont.regions[0].stock.food = 100000;
    for (let i = 0; i < 600; i++) stepGame(cont);

    const split = createGame(5);
    split.regions[0].stock.food = 100000;
    for (let i = 0; i < 300; i++) stepGame(split);
    const reloaded = JSON.parse(JSON.stringify(split)); // simulate save -> load
    for (let i = 0; i < 300; i++) stepGame(reloaded);

    expect(cont.skillPoints).toBeGreaterThan(0);
    expect(reloaded.skillPoints).toBe(cont.skillPoints);
    expect(reloaded.skillPointsAwarded).toBe(cont.skillPointsAwarded);
  });
});

describe("M5 skill tree", () => {
  it("unlocks a node (spending SP), applies its effect, and enforces prereqs", () => {
    const s = createGame(5);
    s.skillPoints = 10;
    expect(canUnlockSkill(s, "eco1")).toBe(true);
    expect(unlockSkill(s, "eco1")).toBe(true);
    expect(s.unlockedSkills).toContain("eco1");
    expect(s.skillPoints).toBe(9);
    expect(aggregateSkillEffects(s).productionMult).toBeCloseTo(1.1);
    expect(canUnlockSkill(s, "eco3")).toBe(false); // needs eco2 first
  });

  it("rejects an unaffordable unlock", () => {
    const s = createGame(5);
    s.skillPoints = 0;
    expect(unlockSkill(s, "eco1")).toBe(false);
  });
});

describe("M5 gating invariants", () => {
  it("keeps starter buildings ungated", () => {
    const starters: BuildingTypeId[] = ["town_center", "hut", "gatherer", "forester", "quarry"];
    for (const id of starters) {
      expect(BUILDINGS[id].requiresTech).toBeUndefined();
      expect(BUILDINGS[id].requiresSkill).toBeUndefined();
    }
  });

  it("never gates a building by BOTH tech and skill", () => {
    for (const id of BUILDABLE_ORDER) {
      const def = BUILDINGS[id];
      expect(!!def.requiresTech && !!def.requiresSkill).toBe(false);
    }
  });
});
