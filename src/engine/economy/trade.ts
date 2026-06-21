/**
 * Trading: convert goods <-> coins at a Trading Post. Prices carry a spread
 * (buy > sell) so trading is useful but not free money. Later this becomes
 * NPC settlements with fluctuating, distance-based prices (see docs/GDD.md).
 */

import type { GameState, Region, ResourceId } from "../types";

export interface TradePrice {
  buy: number; // coins to buy one unit
  sell: number; // coins gained selling one unit
}

export const TRADE_PRICES: Record<ResourceId, TradePrice> = {
  wood: { buy: 3, sell: 1 },
  stone: { buy: 4, sell: 2 },
  food: { buy: 4, sell: 2 },
  tools: { buy: 9, sell: 5 },
};

export const TRADE_BATCH = 10;

/** Buy `qty` units into a region's stock, paid from global coins. */
export function buyResource(
  state: GameState,
  region: Region,
  res: ResourceId,
  qty: number,
): boolean {
  const cost = TRADE_PRICES[res].buy * qty;
  if (state.coins < cost) return false;
  state.coins -= cost;
  region.stock[res] += qty;
  return true;
}

/** Sell `qty` units from a region's stock for global coins. */
export function sellResource(
  state: GameState,
  region: Region,
  res: ResourceId,
  qty: number,
): boolean {
  if (region.stock[res] < qty) return false;
  region.stock[res] -= qty;
  state.coins += TRADE_PRICES[res].sell * qty;
  return true;
}
