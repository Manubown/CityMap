import { describe, it, expect } from "vitest";
import { createGame, placeBuilding, canPlace, claimRegion } from "../src/engine/world";
import { addRoute, routeCapacity, stepRoutes } from "../src/engine/systems/routes";
import type { BuildingTypeId, GridPos, Region } from "../src/engine/types";

function findSpot(region: Region, type: BuildingTypeId): GridPos {
  for (let row = 0; row < region.map.height; row++) {
    for (let col = 0; col < region.map.width; col++) {
      if (canPlace(region, type, col, row, { free: true }).ok) return { col, row };
    }
  }
  throw new Error(`no spot for ${type}`);
}

describe("wagon yard / route capacity", () => {
  it("a Wagon Yard raises a region's route capacity", () => {
    const s = createGame(4);
    const r = s.regions[0];
    expect(routeCapacity(r)).toBe(1);
    const spot = findSpot(r, "wagon_yard");
    expect(placeBuilding(r, "wagon_yard", spot.col, spot.row)).not.toBeNull();
    expect(routeCapacity(r)).toBeCloseTo(2); // +1.0 boost (doubles throughput)
  });

  it("routes carry more goods with a Wagon Yard", () => {
    const s = createGame(4);
    s.coins = 10000;
    const site = s.regions.find((r) => r.kind === "site")!;
    expect(claimRegion(s, site.id)).toBe(true);
    const home = s.regions[0];
    home.stock.wood = 10000;
    addRoute(s, home.id, site.id, "wood", 10);

    const w0 = site.stock.wood;
    stepRoutes(s);
    const movedBase = site.stock.wood - w0;

    const spot = findSpot(home, "wagon_yard");
    placeBuilding(home, "wagon_yard", spot.col, spot.row);
    const w1 = site.stock.wood;
    stepRoutes(s);
    const movedBoosted = site.stock.wood - w1;

    expect(movedBoosted).toBeGreaterThan(movedBase);
  });
});
