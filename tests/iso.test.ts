import { describe, it, expect } from "vitest";
import {
  gridToScreen,
  screenToGrid,
  screenToTile,
  depthKey,
  TILE_W,
  TILE_H,
} from "../src/engine/iso";

describe("isometric coordinate math", () => {
  it("round-trips grid -> screen -> grid for tile centres", () => {
    for (const [col, row] of [
      [0, 0],
      [1, 0],
      [0, 1],
      [3, 7],
      [12, 5],
      [47, 47],
    ] as const) {
      const s = gridToScreen(col, row);
      const g = screenToGrid(s.x, s.y);
      expect(g.col).toBeCloseTo(col, 6);
      expect(g.row).toBeCloseTo(row, 6);
    }
  });

  it("maps a point inside a tile to that tile", () => {
    const c = gridToScreen(4, 6); // centre of tile (4,6)
    expect(screenToTile(c.x, c.y)).toEqual({ col: 4, row: 6 });
    // Nudge towards the tile interior, should stay in the same tile.
    expect(screenToTile(c.x + 2, c.y + 2)).toEqual({ col: 4, row: 6 });
    expect(screenToTile(c.x - 2, c.y - 2)).toEqual({ col: 4, row: 6 });
  });

  it("uses a 2:1 tile and orders depth front-to-back", () => {
    expect(TILE_W).toBe(2 * TILE_H);
    expect(depthKey(5, 5)).toBeGreaterThan(depthKey(2, 2));
    expect(depthKey(0, 0)).toBe(0);
  });
});
