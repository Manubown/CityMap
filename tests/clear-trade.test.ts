import { describe, it, expect } from "vitest";
import { createGame, clearTile } from "../src/engine/world";
import { stepGame } from "../src/engine/tick";
import { addContract, removeContract } from "../src/engine/systems/contracts";
import { tileAt } from "../src/engine/map/generate";
import type { GameMap, GridPos, TerrainType } from "../src/engine/types";

function findTile(map: GameMap, terrain: TerrainType): GridPos | null {
  for (let row = 0; row < map.height; row++) {
    for (let col = 0; col < map.width; col++) {
      const t = tileAt(map, col, row);
      if (t && t.terrain === terrain && !t.buildingId) return { col, row };
    }
  }
  return null;
}

describe("clear land", () => {
  it("clears a forest tile to dirt for coins and yields wood", () => {
    const s = createGame(3);
    const r = s.regions[0];
    s.coins = 50;
    const spot = findTile(r.map, "forest")!;
    expect(spot).not.toBeNull();
    const before = r.stock.wood;
    expect(clearTile(s, r, spot.col, spot.row)).toBe(true);
    expect(tileAt(r.map, spot.col, spot.row)!.terrain).toBe("dirt");
    expect(r.stock.wood).toBe(before + 5);
    expect(s.coins).toBe(45); // forest clear costs 5
  });

  it("won't clear without enough coins, or on plain grass", () => {
    const s = createGame(3);
    const r = s.regions[0];
    const g = findTile(r.map, "grass")!;
    s.coins = 100;
    expect(clearTile(s, r, g.col, g.row)).toBe(false); // grass not clearable
    const forest = findTile(r.map, "forest")!;
    s.coins = 0;
    expect(clearTile(s, r, forest.col, forest.row)).toBe(false); // can't afford
  });
});

describe("standing trade deals", () => {
  it("auto-executes a sell deal at its interval", () => {
    const s = createGame(7);
    const npc = s.regions.find((r) => r.kind === "npc")!;
    const home = s.regions[0];
    home.stock.wood = 100;
    home.stock.food = 100000;
    s.coins = 0;
    addContract(s, npc.id, home.id, "wood", "sell", 10, 20);
    for (let i = 0; i < 25; i++) stepGame(s);
    expect(home.stock.wood).toBeLessThan(100); // exported some
    expect(s.coins).toBeGreaterThan(0); // earned coins
  });

  it("cancelling a deal removes it", () => {
    const s = createGame(7);
    const npc = s.regions.find((r) => r.kind === "npc")!;
    const c = addContract(s, npc.id, s.regions[0].id, "wood", "sell", 10, 20);
    removeContract(s, c.id);
    expect(s.contracts.length).toBe(0);
  });
});
