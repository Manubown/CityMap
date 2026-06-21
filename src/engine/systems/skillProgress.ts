/**
 * Skill points accrue from POPULATION MILESTONES. `skillPointsAwarded` is a
 * monotonic idempotency guard (total ever awarded) so saving + reloading never
 * double-awards and the sim stays deterministic.
 */

import type { GameState } from "../types";

export const SP_PER_MILESTONE = 5; // every 5 total villagers -> 1 skill point

export function stepSkillPoints(state: GameState): void {
  let total = 0;
  for (const r of state.regions) if (r.claimed) total += r.population;
  const milestones = Math.floor(total / SP_PER_MILESTONE);
  while (state.skillPointsAwarded < milestones) {
    state.skillPoints += 1;
    state.skillPointsAwarded += 1;
  }
}
