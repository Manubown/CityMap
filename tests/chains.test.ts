import { describe, it, expect } from "vitest";
import { createGame, placeBuilding, canPlace } from "../src/engine/world";
import { stepGame } from "../src/engine/tick";
import type { BuildingTypeId, GridPos, Region } from "../src/engine/types";

function findSpot(region: Region, type: BuildingTypeId): GridPos {
  for (let row = 0; row < region.map.height; row++) {
    for (let col = 0; col < region.map.width; col++) {
      if (canPlace(region, type, col, row, { free: true }).ok) return { col, row };
    }
  }
  throw new Error(`no spot for ${type}`);
}

describe("processed goods chains", () => {
  it("a Weaver turns reeds into cloth", () => {
    const s = createGame(11);
    const r = s.regions[0];
    r.stock.reeds = 200;
    r.stock.food = 100000;
    const spot = findSpot(r, "weaver");
    expect(placeBuilding(r, "weaver", spot.col, spot.row)).not.toBeNull();
    for (let i = 0; i < 200; i++) stepGame(s);
    expect(r.stock.cloth).toBeGreaterThan(0);
    expect(r.stock.reeds).toBeLessThan(200);
  });

  it("a Glassworks turns sand into glass", () => {
    const s = createGame(11);
    const r = s.regions[0];
    r.stock.sand = 200;
    r.stock.food = 100000;
    const spot = findSpot(r, "glassworks");
    expect(placeBuilding(r, "glassworks", spot.col, spot.row)).not.toBeNull();
    for (let i = 0; i < 200; i++) stepGame(s);
    expect(r.stock.glass).toBeGreaterThan(0);
    expect(r.stock.sand).toBeLessThan(200);
  });
});
