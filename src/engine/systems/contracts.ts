/**
 * Standing trade deals with NPC settlements. A contract auto-executes a buy or
 * sell with an NPC every `everyTicks`, at the NPC's current (drifting) price —
 * the long-term version of a one-off trade. Deterministic: fires purely off the
 * sim tick. If a cycle can't be fulfilled (no goods / no coins) it's skipped and
 * retried next interval.
 */

import type { GameState, ResourceId, TradeContract } from "../types";
import { npcBuy, npcSell } from "../npc/trade";

function regionOf(state: GameState, id: string) {
  return state.regions.find((r) => r.id === id);
}

export function contractId(npcId: string, resource: ResourceId, dir: "buy" | "sell"): string {
  return `${npcId}:${resource}:${dir}`;
}

export function stepContracts(state: GameState): void {
  for (const c of state.contracts) {
    if (state.tick < c.nextTick) continue;
    const npc = regionOf(state, c.npcId);
    const region = regionOf(state, c.regionId);
    if (npc?.npc && region) {
      if (c.dir === "buy") npcBuy(state, npc, region, c.resource, c.qty);
      else npcSell(state, npc, region, c.resource, c.qty);
    }
    c.nextTick = state.tick + c.everyTicks;
  }
}

/** Create or update a standing deal (one per npc+resource+direction). */
export function addContract(
  state: GameState,
  npcId: string,
  regionId: string,
  resource: ResourceId,
  dir: "buy" | "sell",
  qty: number,
  everyTicks: number,
): TradeContract {
  const id = contractId(npcId, resource, dir);
  const next: TradeContract = {
    id,
    npcId,
    regionId,
    resource,
    dir,
    qty,
    everyTicks,
    nextTick: state.tick + everyTicks,
  };
  const existing = state.contracts.find((c) => c.id === id);
  if (existing) Object.assign(existing, next);
  else state.contracts.push(next);
  return next;
}

export function removeContract(state: GameState, id: string): void {
  state.contracts = state.contracts.filter((c) => c.id !== id);
}
