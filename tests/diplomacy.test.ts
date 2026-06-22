import { describe, it, expect } from "vitest";
import { createGame } from "../src/engine/world";
import { npcSell, repModifier, repTier } from "../src/engine/npc/trade";

describe("diplomacy & living markets", () => {
  it("reputation improves your prices", () => {
    expect(repModifier(0)).toEqual({ buyMult: 1, sellMult: 1 });
    const m = repModifier(100);
    expect(m.buyMult).toBeCloseTo(0.7);
    expect(m.sellMult).toBeCloseTo(1.3);
    expect(repTier(0)).toBe("Neutral");
    expect(repTier(60)).toBe("Trusted");
    expect(repTier(100)).toBe("Allied");
  });

  it("selling floods an NPC's market and lowers its buy price", () => {
    const s = createGame(3);
    const npc = s.regions.find((r) => r.kind === "npc")!;
    const home = s.regions[0];
    home.stock.wood = 1000;
    const before = npc.npc!.prices.wood.buy;
    for (let i = 0; i < 5; i++) npcSell(s, npc, home, "wood", 50);
    expect(npc.npc!.prices.wood.buy).toBeLessThan(before);
    expect(npc.npc!.reputation).toBeGreaterThan(0);
  });

  it("NPC settlements have a baseline + population", () => {
    const s = createGame(3);
    const npc = s.regions.find((r) => r.kind === "npc")!;
    expect(npc.npc!.population).toBeGreaterThan(0);
    expect(npc.npc!.basePrices.wood.buy).toBeGreaterThan(0);
  });
});
