import { describe, it, expect } from "vitest";
import { createGame, claimRegion } from "../src/engine/world";
import { stepGame } from "../src/engine/tick";
import { npcBuy, npcSell } from "../src/engine/npc/trade";
import { RESOURCES } from "../src/engine/economy/resources";
import type { ResourceId } from "../src/engine/types";

const SEED = 42;
const IDS = Object.keys(RESOURCES) as ResourceId[];

describe("M3 world", () => {
  it("generates a centre Homeland + a ring of sites and NPCs", () => {
    const state = createGame(SEED);
    expect(state.regions.length).toBe(7); // centre + 6
    expect(state.regions.filter((r) => r.kind === "player").length).toBe(1);
    expect(state.regions.filter((r) => r.kind === "site").length).toBe(3);
    expect(state.regions.filter((r) => r.kind === "npc").length).toBe(3);
    expect(state.regions[0].worldPos).toEqual({ q: 0, r: 0 });
    expect(new Set(state.regions.map((r) => r.biome)).size).toBeGreaterThan(1);
  });

  it("claiming a site makes it a player colony with a Town Center", () => {
    const state = createGame(SEED);
    const site = state.regions.find((r) => r.kind === "site")!;
    state.coins = 1000;
    expect(claimRegion(state, site.id)).toBe(true);
    expect(site.claimed).toBe(true);
    expect(site.kind).toBe("player");
    expect(Object.values(site.buildings).some((b) => b.type === "town_center")).toBe(true);
    expect(site.population).toBeGreaterThan(0);
  });

  it("cannot claim an NPC settlement", () => {
    const state = createGame(SEED);
    const npc = state.regions.find((r) => r.kind === "npc")!;
    state.coins = 100000;
    expect(claimRegion(state, npc.id)).toBe(false);
  });
});

describe("M3 NPC trade", () => {
  it("has a complete price table (no NaN) and trade moves goods + coins + reputation", () => {
    const state = createGame(SEED);
    const npc = state.regions.find((r) => r.kind === "npc")!;
    const home = state.regions[0];
    for (const id of IDS) {
      expect(Number.isFinite(npc.npc!.prices[id].buy)).toBe(true);
      expect(Number.isFinite(npc.npc!.prices[id].sell)).toBe(true);
    }
    state.coins = 1000;
    home.stock.wood = 0;
    expect(npcBuy(state, npc, home, "wood", 10)).toBe(true);
    expect(home.stock.wood).toBe(10);
    expect(npc.npc!.reputation).toBeGreaterThan(0);

    const coinsBefore = state.coins;
    expect(npcSell(state, npc, home, "wood", 10)).toBe(true);
    expect(home.stock.wood).toBe(0);
    expect(state.coins).toBeGreaterThan(coinsBefore);
  });

  it("NPC price drift is deterministic", () => {
    const run = () => {
      const state = createGame(SEED);
      for (let i = 0; i < 200; i++) stepGame(state);
      return state.regions.find((r) => r.kind === "npc")!.npc!.prices.wood;
    };
    expect(run()).toEqual(run());
  });
});
