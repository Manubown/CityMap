/**
 * NPC economies: every so often each NPC settlement's prices drift a little, so
 * markets feel alive and trade timing matters. Deterministic — the drift RNG is
 * seeded from worldSeed + the node's coord + the tick, never Math.random.
 */

import type { GameState, ResourceId } from "../types";
import { createRng } from "../rng";
import { hashCoord } from "../world/coords";

const DRIFT_EVERY = 40; // ticks (~10s)

export function stepNpcEconomy(state: GameState): void {
  if (state.tick % DRIFT_EVERY !== 0) return;
  for (const r of state.regions) {
    if (r.kind !== "npc" || !r.npc) continue;
    const rng = createRng((state.worldSeed ^ hashCoord(r.worldPos) ^ state.tick) >>> 0);
    for (const id of Object.keys(r.npc.prices) as ResourceId[]) {
      const p = r.npc.prices[id];
      const drift = 0.95 + rng.next() * 0.1; // 0.95 .. 1.05
      p.buy = Math.max(2, Math.round(p.buy * drift));
      p.sell = Math.max(1, Math.min(p.sell, p.buy - 1));
    }
  }
}
