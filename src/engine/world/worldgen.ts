/**
 * World layout: a small radius-1 world — your Homeland at the centre plus a
 * ring of claimable SITES (varied biomes to expand into) and NPC settlements to
 * trade with. (Larger radii + fog-of-war reveal are a follow-up.)
 */

import type { BiomeId, RegionKind, WorldCoord } from "../types";
import { withinRadius } from "./coords";
import { archetypeFor } from "../npc/archetypes";

export interface RegionDescriptor {
  id: string;
  name: string;
  worldPos: WorldCoord;
  kind: RegionKind;
  biome: BiomeId;
  claimCost: number;
  discovered: boolean;
}

const RING_BIOMES: BiomeId[] = ["forest", "mountains", "wetland", "desert", "coast", "plains"];
const SITE_NAMES: Record<BiomeId, string> = {
  plains: "Green Meadow",
  forest: "Old Forest",
  mountains: "Iron Peaks",
  wetland: "Misty Marsh",
  desert: "Dunelands",
  coast: "Bluewater Cove",
};

export function worldLayout(): RegionDescriptor[] {
  const coords = withinRadius(1); // centre + 6 neighbours
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
    const ringIndex = i - 1; // 0..5
    const biome = RING_BIOMES[ringIndex];
    const isSite = ringIndex < 3; // first 3 are claimable sites, rest are NPCs
    return {
      id: `r${i + 1}`,
      name: isSite ? SITE_NAMES[biome] : archetypeFor(biome).name,
      worldPos: c,
      kind: isSite ? "site" : "npc",
      biome,
      claimCost: 70 + ringIndex * 40,
      discovered: true,
    };
  });
}
