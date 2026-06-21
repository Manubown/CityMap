/**
 * Trading with NPC settlements. Like the player Trading Post, but each NPC has
 * its own (biome-flavoured, drifting) price table and gains reputation as you
 * trade. Goods move into/out of one of YOUR regions; coins are global.
 */

import type { GameState, Region, ResourceId } from "../types";

export const NPC_TRADE_BATCH = 10;

/** Buy `qty` from an NPC into your region's stock, paid from global coins. */
export function npcBuy(
  state: GameState,
  npc: Region,
  into: Region,
  res: ResourceId,
  qty: number,
): boolean {
  if (!npc.npc) return false;
  const cost = npc.npc.prices[res].buy * qty;
  if (state.coins < cost) return false;
  state.coins -= cost;
  into.stock[res] += qty;
  npc.npc.reputation = Math.min(100, npc.npc.reputation + 1);
  return true;
}

/** Sell `qty` from your region's stock to an NPC for global coins. */
export function npcSell(
  state: GameState,
  npc: Region,
  from: Region,
  res: ResourceId,
  qty: number,
): boolean {
  if (!npc.npc) return false;
  if (from.stock[res] < qty) return false;
  from.stock[res] -= qty;
  state.coins += npc.npc.prices[res].sell * qty;
  npc.npc.reputation = Math.min(100, npc.npc.reputation + 1);
  return true;
}
