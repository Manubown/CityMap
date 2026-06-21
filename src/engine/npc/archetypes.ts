/**
 * NPC settlement archetypes. Each NPC has a home biome and a specialty (goods
 * it sells cheaply). Prices are built COMPLETE over every ResourceId so a trade
 * can never read undefined -> NaN (the review's key correctness item).
 */

import type { BiomeId, NpcState, ResourceId } from "../types";
import { TRADE_PRICES } from "../economy/trade";
import { RESOURCES } from "../economy/resources";
import type { Rng } from "../rng";

export interface NpcArchetype {
  id: string;
  name: string;
  biome: BiomeId;
  /** Goods this settlement specialises in (cheaper to buy from them). */
  sells: ResourceId[];
}

const ARCHETYPES: Record<BiomeId, NpcArchetype> = {
  plains: { id: "farmers", name: "Plains Farmers", biome: "plains", sells: ["grain", "food"] },
  forest: { id: "tribe", name: "Forest Tribe", biome: "forest", sells: ["game", "wood"] },
  mountains: {
    id: "clan",
    name: "Mountain Clan",
    biome: "mountains",
    sells: ["ore", "copper", "tin", "stone"],
  },
  wetland: { id: "marsh", name: "Marsh Folk", biome: "wetland", sells: ["reeds"] },
  desert: { id: "nomads", name: "Desert Nomads", biome: "desert", sells: ["sand", "tools"] },
  coast: { id: "traders", name: "Coastal Traders", biome: "coast", sells: ["sand", "food"] },
};

export function archetypeFor(biome: BiomeId): NpcArchetype {
  return ARCHETYPES[biome];
}

/** A complete NPC price table (all resources), biased by specialty + seeded jitter. */
export function makeNpcState(biome: BiomeId, rng: Rng): NpcState {
  const arch = ARCHETYPES[biome];
  const prices = {} as Record<ResourceId, { buy: number; sell: number }>;
  for (const id of Object.keys(RESOURCES) as ResourceId[]) {
    const base = TRADE_PRICES[id];
    const jitter = 0.85 + rng.next() * 0.3; // 0.85 .. 1.15
    const specialty = arch.sells.includes(id);
    const buy = Math.max(1, Math.round(base.buy * jitter * (specialty ? 0.7 : 1)));
    const sell = Math.max(1, Math.round(base.sell * jitter * (specialty ? 0.85 : 1)));
    prices[id] = { buy, sell };
  }
  return { archetype: arch.name, reputation: 0, prices };
}
