/**
 * World layout: a radius-2 hex world — your Homeland at the centre, an inner ring
 * of claimable SITES + NPC settlements (visible from the start), and an outer
 * ring hidden by fog of war until you claim or scout your way out to it.
 */

import type { BiomeId, RegionKind, WorldCoord } from "../types";
import { withinRadius, hexDistance } from "./coords";
import { archetypeFor } from "../npc/archetypes";

export const WORLD_RADIUS = 2;

export interface RegionDescriptor {
  id: string;
  name: string;
  worldPos: WorldCoord;
  kind: RegionKind;
  biome: BiomeId;
  claimCost: number;
  discovered: boolean;
}

const BIOMES: BiomeId[] = ["forest", "mountains", "wetland", "desert", "coast", "plains"];
const SITE_NAMES: Record<BiomeId, string> = {
  plains: "Green Meadow",
  forest: "Old Forest",
  mountains: "Iron Peaks",
  wetland: "Misty Marsh",
  desert: "Dunelands",
  coast: "Bluewater Cove",
};
const ROMAN = ["", " II", " III", " IV", " V", " VI"];

export function worldLayout(): RegionDescriptor[] {
  const coords = withinRadius(WORLD_RADIUS); // centre first, then by ring
  const used = new Map<string, number>();
  const unique = (base: string): string => {
    const n = used.get(base) ?? 0;
    used.set(base, n + 1);
    return base + (ROMAN[n] ?? ` ${n + 1}`);
  };

  return coords.map((c, i): RegionDescriptor => {
    if (i === 0) {
      return {
        id: "r1",
        name: "Homeland",
        worldPos: c,
        kind: "player",
        biome: "plains",
        claimCost: 0,
        discovered: true,
      };
    }
    const dist = hexDistance({ q: 0, r: 0 }, c);
    const biome = BIOMES[(i - 1) % BIOMES.length];
    const isSite = i % 2 === 1; // alternate site / npc
    return {
      id: `r${i + 1}`,
      name: unique(isSite ? SITE_NAMES[biome] : archetypeFor(biome).name),
      worldPos: c,
      kind: isSite ? "site" : "npc",
      biome,
      // costlier the further out; fogged beyond the first ring
      claimCost: Math.round(60 + dist * 70 + ((i - 1) % 3) * 20),
      discovered: dist <= 1,
    };
  });
}
