import { describe, it, expect } from "vitest";
import { createGame, placeBuilding, canPlace } from "../src/engine/world";
import { stepGame } from "../src/engine/tick";
import { completeTech, AGE_NAMES } from "../src/engine/research/techs";
import { TIERS } from "../src/engine/systems/population";
import type { BuildingTypeId, GridPos, Region } from "../src/engine/types";

function findSpot(region: Region, type: BuildingTypeId): GridPos {
  for (let row = 0; row < region.map.height; row++) {
    for (let col = 0; col < region.map.width; col++) {
      if (canPlace(region, type, col, row, { free: true }).ok) return { col, row };
    }
  }
  throw new Error(`no spot for ${type}`);
}

describe("Iron Age", () => {
  it("Iron Working advances to the Iron Age", () => {
    const s = createGame(7);
    s.research.points = 10000;
    for (const t of ["prospecting", "smelting", "bronze_working", "iron_working"]) {
      expect(completeTech(s, t)).toBe(true);
    }
    expect(s.research.age).toBe(3);
    expect(AGE_NAMES[3]).toBe("Iron Age");
  });

  it("a Bloomery smelts ore into iron, a Blacksmith forges iron tools", () => {
    const s = createGame(7);
    const r = s.regions[0];
    r.stock.ore = 1000;
    r.stock.food = 100000;
    r.stock.wood = 1000;
    r.stock.stone = 1000;
    const b1 = findSpot(r, "bloomery");
    expect(placeBuilding(r, "bloomery", b1.col, b1.row)).not.toBeNull();
    for (let i = 0; i < 200; i++) stepGame(s);
    expect(r.stock.iron).toBeGreaterThan(0);

    r.stock.iron += 100;
    const b2 = findSpot(r, "blacksmith");
    expect(placeBuilding(r, "blacksmith", b2.col, b2.row)).not.toBeNull();
    for (let i = 0; i < 200; i++) stepGame(s);
    expect(r.stock.iron_tools).toBeGreaterThan(0);
  });

  it("adds a 4th population tier (Townsfolk) demanding iron tools", () => {
    expect(TIERS.length).toBe(4);
    expect(TIERS[3].name).toBe("Townsfolk");
    expect(TIERS[3].needs.iron_tools ?? 0).toBeGreaterThan(0);
  });
});
