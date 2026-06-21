/**
 * Global PoE2-style skill tree (M5). DISTINCT from per-building upgrade trees:
 * this is empire-wide. All nodes radiate from one central `root`, branching into
 * topic clusters (Economy / Society / Knowledge / Expansion). Unlocked nodes
 * grant multiplicative bonuses (composed on top of per-building upgrades) and can
 * gate buildings via BuildingDef.requiresSkill. Skill points come from
 * population milestones (progression.ts).
 */

import type { BuildingTypeId, GameState } from "../types";

export interface SkillEffectDef {
  productionMult?: number;
  popGrowthMult?: number;
  taxMult?: number;
  researchMult?: number;
  claimCostMult?: number;
  /** Reserved: a node can unlock a building gated by requiresSkill. */
  unlocksBuilding?: BuildingTypeId;
}

export interface SkillNode {
  id: string;
  name: string;
  description: string;
  cost: number; // skill points
  requires: string[];
  pos: { x: number; y: number }; // grid units (rendered * spacing)
  effects: SkillEffectDef;
}

export const SKILL_TREE: SkillNode[] = [
  { id: "root", name: "Foundations", description: "The heart of your culture.", cost: 0, requires: [], pos: { x: 0, y: 0 }, effects: {} },

  // Economy (right)
  { id: "eco1", name: "Sharper Tools", description: "+10% production everywhere.", cost: 1, requires: ["root"], pos: { x: 1, y: 0 }, effects: { productionMult: 1.1 } },
  { id: "eco2", name: "Workshops", description: "+15% production.", cost: 2, requires: ["eco1"], pos: { x: 2, y: 0 }, effects: { productionMult: 1.15 } },
  { id: "eco3", name: "Guilds", description: "+20% production.", cost: 3, requires: ["eco2"], pos: { x: 3, y: 0.6 }, effects: { productionMult: 1.2 } },
  { id: "eco4", name: "Logistics", description: "+10% production.", cost: 3, requires: ["eco2"], pos: { x: 3, y: -0.6 }, effects: { productionMult: 1.1 } },

  // Society (down)
  { id: "soc1", name: "Healthy Diet", description: "+25% population growth.", cost: 1, requires: ["root"], pos: { x: 0, y: 1 }, effects: { popGrowthMult: 1.25 } },
  { id: "soc2", name: "Prosperity", description: "+20% taxes.", cost: 2, requires: ["soc1"], pos: { x: 0, y: 2 }, effects: { taxMult: 1.2 } },
  { id: "soc3", name: "Festivals", description: "+20% population growth.", cost: 3, requires: ["soc2"], pos: { x: 0.9, y: 2.7 }, effects: { popGrowthMult: 1.2 } },
  { id: "soc4", name: "Taxation", description: "+20% taxes.", cost: 3, requires: ["soc2"], pos: { x: -0.9, y: 2.7 }, effects: { taxMult: 1.2 } },

  // Knowledge (left)
  { id: "kno1", name: "Scholars", description: "+30% research.", cost: 1, requires: ["root"], pos: { x: -1, y: 0 }, effects: { researchMult: 1.3 } },
  { id: "kno2", name: "Libraries", description: "+40% research.", cost: 2, requires: ["kno1"], pos: { x: -2, y: 0 }, effects: { researchMult: 1.4 } },

  // Expansion (up)
  { id: "exp1", name: "Cartography", description: "-15% city claim cost.", cost: 1, requires: ["root"], pos: { x: 0, y: -1 }, effects: { claimCostMult: 0.85 } },
  { id: "exp2", name: "Settlers' Charter", description: "-20% claim cost.", cost: 2, requires: ["exp1"], pos: { x: 0, y: -2 }, effects: { claimCostMult: 0.8 } },
];

export interface SkillEffects {
  productionMult: number;
  popGrowthMult: number;
  taxMult: number;
  researchMult: number;
  claimCostMult: number;
}

export function emptySkillEffects(): SkillEffects {
  return { productionMult: 1, popGrowthMult: 1, taxMult: 1, researchMult: 1, claimCostMult: 1 };
}

/** Combine the effects of every unlocked skill node (empire-wide). */
export function aggregateSkillEffects(state: GameState): SkillEffects {
  const eff = emptySkillEffects();
  for (const node of SKILL_TREE) {
    if (!state.unlockedSkills.includes(node.id)) continue;
    const e = node.effects;
    if (e.productionMult) eff.productionMult *= e.productionMult;
    if (e.popGrowthMult) eff.popGrowthMult *= e.popGrowthMult;
    if (e.taxMult) eff.taxMult *= e.taxMult;
    if (e.researchMult) eff.researchMult *= e.researchMult;
    if (e.claimCostMult) eff.claimCostMult *= e.claimCostMult;
  }
  return eff;
}

export function getSkillNode(id: string): SkillNode | undefined {
  return SKILL_TREE.find((n) => n.id === id);
}

export function canUnlockSkill(state: GameState, id: string): boolean {
  const node = getSkillNode(id);
  if (!node || state.unlockedSkills.includes(id)) return false;
  if (!node.requires.every((r) => state.unlockedSkills.includes(r))) return false;
  return state.skillPoints >= node.cost;
}

export function unlockSkill(state: GameState, id: string): boolean {
  if (!canUnlockSkill(state, id)) return false;
  state.skillPoints -= getSkillNode(id)!.cost;
  state.unlockedSkills.push(id);
  return true;
}
