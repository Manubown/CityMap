/**
 * Research accrual: each tick the empire earns research points proportional to
 * its total (claimed) population. Deterministic — no RNG. Points are spent on
 * the tech ladder (research/techs.ts).
 */

import type { GameState } from "../types";

export const RESEARCH_PER_POP = 0.0015; // points per villager per tick

export function stepResearch(state: GameState): void {
  let pop = 0;
  for (const r of state.regions) if (r.claimed) pop += r.population;
  state.research.points += pop * RESEARCH_PER_POP;
}
