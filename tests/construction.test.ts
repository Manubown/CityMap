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

describe("construction", () => {
  it("a new building finishes over time and isn't productive until built", () => {
    const s = createGame(2);
    const r = s.regions[0];
    r.stock.food = 100000;
    const spot = findSpot(r, "forester");
    const b = placeBuilding(r, "forester", spot.col, spot.row)!;
    b.built = false; // simulate an interactive player build
    b.buildProgress = 0;

    for (let i = 0; i < 6; i++) stepGame(s);
    expect(b.built).toBe(false);
    expect(b.productivity).toBe(0);

    for (let i = 0; i < 60; i++) stepGame(s);
    expect(b.built).toBe(true);
    expect(b.buildProgress).toBe(1);
  });

  it("builder huts speed up building many sites at once", () => {
    const run = (withHut: boolean): number => {
      const s = createGame(2);
      const r = s.regions[0];
      r.stock.food = 100000;
      if (withHut) {
        const hs = findSpot(r, "builder_hut");
        placeBuilding(r, "builder_hut", hs.col, hs.row); // built instantly, +capacity
      }
      const sites = [];
      for (let i = 0; i < 3; i++) {
        const sp = findSpot(r, "hut");
        const b = placeBuilding(r, "hut", sp.col, sp.row)!;
        b.built = false;
        b.buildProgress = 0;
        sites.push(b);
      }
      let ticks = 0;
      while (sites.some((b) => !b.built) && ticks < 500) {
        stepGame(s);
        ticks++;
      }
      return ticks;
    };
    expect(run(true)).toBeLessThan(run(false));
  });
});
