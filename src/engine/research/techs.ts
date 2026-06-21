/**
 * Research tech ladder (M2). Research points (from population) are spent to
 * complete techs; techs unlock buildings (via BuildingDef.requiresTech) and can
 * advance the Age. This is the "tech/age" progression currency, distinct from
 * the global skill tree (M5).
 */

import type { GameState } from "../types";

export interface Tech {
  id: string;
  name: string;
  description: string;
  cost: number; // research points
  requires: string[]; // prerequisite tech ids
  unlocksAge?: number; // advances research.age to this on completion
}

export const TECHS: Tech[] = [
  {
    id: "prospecting",
    name: "Prospecting",
    description: "Mine Copper & Tin from deposits.",
    cost: 40,
    requires: [],
  },
  {
    id: "smelting",
    name: "Smelting",
    description: "Smelt Copper + Tin into Bronze.",
    cost: 70,
    requires: ["prospecting"],
  },
  {
    id: "bronze_working",
    name: "Bronze Working",
    description: "Enter the Bronze Age — forge Bronze Tools.",
    cost: 120,
    requires: ["smelting"],
    unlocksAge: 2,
  },
];

export const AGE_NAMES: Record<number, string> = { 1: "Stone Age", 2: "Bronze Age" };

export function getTech(id: string): Tech | undefined {
  return TECHS.find((t) => t.id === id);
}

export function canResearch(state: GameState, id: string): boolean {
  const tech = getTech(id);
  if (!tech || state.research.completed.includes(id)) return false;
  if (!tech.requires.every((r) => state.research.completed.includes(r))) return false;
  return state.research.points >= tech.cost;
}

/** Spend points to complete a tech; advances the Age if it unlocks one. */
export function completeTech(state: GameState, id: string): boolean {
  if (!canResearch(state, id)) return false;
  const tech = getTech(id)!;
  state.research.points -= tech.cost;
  state.research.completed.push(id);
  if (tech.unlocksAge && tech.unlocksAge > state.research.age) {
    state.research.age = tech.unlocksAge;
  }
  return true;
}

/** Techs that can be researched next (prereqs met, not yet completed). */
export function availableTechs(state: GameState): Tech[] {
  return TECHS.filter(
    (t) =>
      !state.research.completed.includes(t.id) &&
      t.requires.every((r) => state.research.completed.includes(r)),
  );
}
