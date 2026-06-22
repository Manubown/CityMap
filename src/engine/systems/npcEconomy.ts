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
      const base = r.npc.basePrices[id];
      // mean-revert 20% toward baseline (undo the pull from your trades)...
      p.buy = p.buy + (base.buy - p.buy) * 0.2;
      p.sell = p.sell + (base.sell - p.sell) * 0.2;
      // ...then a small random drift.
      const drift = 0.97 + rng.next() * 0.06; // 0.97 .. 1.03
      p.buy = Math.max(2, Math.round(p.buy * drift));
      p.sell = Math.max(1, Math.min(Math.round(p.sell), p.buy - 1));
    }
    r.npc.population = Math.min(999, r.npc.population + 1); // settlements grow
  }
}
