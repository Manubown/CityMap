import { describe, it, expect } from "vitest";
import { createGame } from "../src/engine/world";
import { emptyStock, startingStock, RESOURCES } from "../src/engine/economy/resources";
import type { ResourceId } from "../src/engine/types";

const IDS = Object.keys(RESOURCES) as ResourceId[];

describe("M0a unified schema", () => {
  it("stock records cover every resource (no undefined -> NaN)", () => {
    for (const s of [emptyStock(), startingStock()]) {
      for (const id of IDS) {
        expect(typeof s[id]).toBe("number");
        expect(Number.isNaN(s[id])).toBe(false);
      }
    }
  });

  it("createGame initializes the new world + progression fields", () => {
    const state = createGame(123);
    expect(state.worldSeed).toBe(123);
    expect(state.research.age).toBe(1);
    expect(state.skillPoints).toBe(0);
    expect(state.skillPointsAwarded).toBe(0);
    expect(state.unlockedSkills).toContain("root");

    const r = state.regions[0];
    expect(r.worldPos).toEqual({ q: 0, r: 0 });
    expect(r.kind).toBe("player");
    expect(r.biome).toBe("plains");
    expect(Array.isArray(r.agents)).toBe(true);
    expect(r.mapSeed).toBe(123);
  });

  it("state round-trips through JSON (save compatibility)", () => {
    const state = createGame(7);
    const round = JSON.parse(JSON.stringify(state));
    expect(round).toEqual(state);
  });
});
