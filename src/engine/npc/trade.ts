/**
 * Trading with NPC settlements. Each NPC has its own (biome-flavoured, drifting)
 * price table. Diplomacy: reputation rises as you trade and buys you better
 * prices. Living markets: your trades push prices (selling floods a good and
 * lowers its buy price; buying makes it scarce and raises its sell price), and
 * the market mean-reverts toward its baseline over time (npcEconomy).
 */

import type { GameState, NpcState, Region, ResourceId } from "../types";

export const NPC_TRADE_BATCH = 10;

/** Reputation -> price multipliers (up to ±30% in your favour at rep 100). */
export function repModifier(reputation: number): { buyMult: number; sellMult: number } {
  const f = Math.min(1, Math.max(0, reputation / 100));
  return { buyMult: 1 - f * 0.3, sellMult: 1 + f * 0.3 };
}

export function repTier(reputation: number): string {
  if (reputation >= 80) return "Allied";
  if (reputation >= 50) return "Trusted";
  if (reputation >= 20) return "Friendly";
  return "Neutral";
}

/** Nudge a good's price after a trade ("buy" = you bought, "sell" = you sold). */
function reactPrice(npc: NpcState, res: ResourceId, dir: "buy" | "sell", qty: number): void {
  const p = npc.prices[res];
  const k = Math.min(0.15, 0.003 * qty);
  if (dir === "buy") {
    // you bought it -> scarcer -> sell price up (at least +1)
    p.sell = Math.max(p.sell + 1, Math.round(p.sell * (1 + k)));
    p.buy = Math.max(p.buy, Math.round(p.buy * (1 + k * 0.5)));
  } else {
    // you sold it -> flooded -> buy price down (at least -1, floor 2)
    p.buy = Math.max(2, Math.min(p.buy - 1, Math.round(p.buy * (1 - k))));
  }
  p.sell = Math.max(1, Math.min(p.sell, p.buy - 1));
}

/** Buy `qty` from an NPC into your region's stock, paid from global coins. */
export function npcBuy(
  state: GameState,
  npc: Region,
  into: Region,
  res: ResourceId,
  qty: number,
): boolean {
  if (!npc.npc) return false;
  const mod = repModifier(npc.npc.reputation);
  const cost = Math.round(npc.npc.prices[res].buy * mod.buyMult * qty);
  if (state.coins < cost) return false;
  state.coins -= cost;
  into.stock[res] += qty;
  npc.npc.reputation = Math.min(100, npc.npc.reputation + 1);
  reactPrice(npc.npc, res, "buy", qty);
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
  const mod = repModifier(npc.npc.reputation);
  from.stock[res] -= qty;
  state.coins += Math.round(npc.npc.prices[res].sell * mod.sellMult * qty);
  npc.npc.reputation = Math.min(100, npc.npc.reputation + 1);
  reactPrice(npc.npc, res, "sell", qty);
  return true;
}
