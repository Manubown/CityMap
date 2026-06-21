import { describe, it, expect } from "vitest";
import { generateMap } from "../src/engine/map/generate";
import type { BiomeId, Tile } from "../src/engine/types";

const SEED = 2024;

function tilesOf(biome: BiomeId): Tile[] {
  return generateMap(SEED, biome).tiles;
}

describe("biome map generation", () => {
  it("is deterministic for the same seed + biome", () => {
    expect(generateMap(SEED, "mountains")).toEqual(generateMap(SEED, "mountains"));
    // different biome -> different map
    expect(generateMap(SEED, "plains")).not.toEqual(generateMap(SEED, "mountains"));
  });

  it("guarantees a buildable centre + reachable wood/stone/both bronze ores", () => {
    for (const biome of ["plains", "forest", "mountains", "desert"] as BiomeId[]) {
      const map = generateMap(SEED, biome);
      const cc = Math.floor(map.width / 2);
      const cr = Math.floor(map.height / 2);
      const at = (c: number, r: number) => map.tiles[r * map.width + c];

      // central apron is buildable grass
      expect(at(cc, cr).terrain).toBe("grass");

      const all = map.tiles;
      expect(all.some((t) => t.terrain === "forest")).toBe(true); // wood
      expect(all.some((t) => t.terrain === "rock")).toBe(true); // stone
      expect(all.some((t) => t.deposit === "copper")).toBe(true); // bronze
      expect(all.some((t) => t.deposit === "tin")).toBe(true); // bronze
    }
  });

  it("paints terrain from the biome palette (mountains are rocky, plains grassy)", () => {
    const count = (tiles: Tile[], terr: string) => tiles.filter((t) => t.terrain === terr).length;
    const mountains = tilesOf("mountains");
    const plains = tilesOf("plains");
    expect(count(mountains, "rock")).toBeGreaterThan(count(mountains, "grass"));
    expect(count(plains, "grass")).toBeGreaterThan(count(plains, "rock"));
    // mountains carry ore deposits
    expect(mountains.some((t) => t.terrain === "deposit")).toBe(true);
  });
});
