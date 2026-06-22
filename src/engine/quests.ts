/**
 * Objective quests (Phase 3): milestone goals that give the sandbox direction.
 * Each quest has a completion predicate + a reward (coins / goods / skill points
 * / an auto-built building). Completed ids live on GameState.completedQuests;
 * stepQuests checks the open ones each tick and pays out. Deterministic.
 */

import type { BuildingTypeId, GameState, Region, ResourceId, ResourceMap } from "./types";
import { getBuildingDef } from "./buildings/registry";
import { deposit, RESOURCES } from "./economy/resources";
import { canPlace, placeBuilding } from "./world";

export interface QuestReward {
  coins?: number;
  resources?: ResourceMap;
  skillPoints?: number;
  /** A building the villagers raise for you in the homeland on completion. */
  building?: BuildingTypeId;
}

export interface Quest {
  id: string;
  title: string;
  goal: string;
  reward: QuestReward;
  done: (s: GameState) => boolean;
  /** Optional 0..1 progress for the UI. */
  progress?: (s: GameState) => number;
}

const home = (s: GameState): Region => s.regions[0];
const claimed = (s: GameState): number => s.regions.filter((r) => r.claimed).length;
const builtOf = (s: GameState, pred: (type: BuildingTypeId) => boolean): boolean =>
  Object.values(home(s).buildings).some((b) => b.built && pred(b.type));
const maxTier = (s: GameState): number =>
  Object.values(home(s).buildings).reduce(
    (m, b) => (getBuildingDef(b.type).housing ? Math.max(m, b.tier) : m),
    1,
  );
const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));

export const QUESTS: Quest[] = [
  {
    id: "grow_village",
    title: "A Growing Village",
    goal: "Reach 8 villagers in your homeland",
    reward: { coins: 40, building: "hut" },
    done: (s) => home(s).population >= 8,
    progress: (s) => clamp01(home(s).population / 8),
  },
  {
    id: "fresh_water",
    title: "Fresh Water",
    goal: "Build a Well",
    reward: { resources: { tools: 8 }, coins: 20 },
    done: (s) => builtOf(s, (t) => getBuildingDef(t).service === "water"),
  },
  {
    id: "open_market",
    title: "Open for Business",
    goal: "Build a Trading Post",
    reward: { coins: 60 },
    done: (s) => builtOf(s, (t) => getBuildingDef(t).trade === true),
  },
  {
    id: "prospector",
    title: "Prospector",
    goal: "Research Prospecting",
    reward: { skillPoints: 1, coins: 30 },
    done: (s) => s.research.completed.includes("prospecting"),
  },
  {
    id: "trade_route",
    title: "Trade Lanes",
    goal: "Run a trade route between cities",
    reward: { coins: 50 },
    done: (s) => s.routes.length >= 1,
  },
  {
    id: "expand",
    title: "Expand the Realm",
    goal: "Claim a second city on the world map",
    reward: { coins: 120, building: "wagon_yard" },
    done: (s) => claimed(s) >= 2,
  },
  {
    id: "bronze_age",
    title: "The Bronze Age",
    goal: "Advance to the Bronze Age",
    reward: { coins: 100, skillPoints: 1 },
    done: (s) => s.research.age >= 2,
  },
  {
    id: "citizens",
    title: "City of Citizens",
    goal: "Raise a home to the Citizens tier",
    reward: { coins: 80 },
    done: (s) => maxTier(s) >= 3,
  },
  {
    id: "iron_age",
    title: "The Iron Age",
    goal: "Advance to the Iron Age",
    reward: { coins: 150, skillPoints: 2 },
    done: (s) => s.research.age >= 3,
  },
  {
    id: "townsfolk",
    title: "A Thriving Town",
    goal: "Raise a home to the Townsfolk tier",
    reward: { coins: 200, skillPoints: 2 },
    done: (s) => maxTier(s) >= 4,
  },
];

export function questRewardLabel(r: QuestReward): string {
  const parts: string[] = [];
  if (r.coins) parts.push(`🪙 ${r.coins}`);
  if (r.skillPoints) parts.push(`🌟 ${r.skillPoints}`);
  if (r.resources) {
    for (const k of Object.keys(r.resources) as ResourceId[]) {
      parts.push(`${RESOURCES[k].glyph} ${r.resources[k]}`);
    }
  }
  if (r.building) parts.push(`🏗 ${getBuildingDef(r.building).name}`);
  return parts.join(" · ");
}

/** Place a free, finished building on the nearest valid tile to the centre. */
function autoPlace(region: Region, type: BuildingTypeId): void {
  const cc = Math.floor(region.map.width / 2) - 1;
  const cr = Math.floor(region.map.height / 2) - 1;
  const cells: { col: number; row: number; d: number }[] = [];
  for (let row = 0; row < region.map.height; row++) {
    for (let col = 0; col < region.map.width; col++) {
      cells.push({ col, row, d: Math.abs(col - cc) + Math.abs(row - cr) });
    }
  }
  cells.sort((a, b) => a.d - b.d);
  for (const c of cells) {
    if (canPlace(region, type, c.col, c.row, { free: true }).ok) {
      placeBuilding(region, type, c.col, c.row, { free: true });
      return;
    }
  }
}

function payReward(state: GameState, reward: QuestReward): void {
  const region = state.regions[0];
  if (reward.coins) state.coins += reward.coins;
  if (reward.skillPoints) state.skillPoints += reward.skillPoints;
  if (reward.resources) deposit(region.stock, reward.resources);
  if (reward.building) autoPlace(region, reward.building);
}

/** Complete any newly-satisfied quests and pay rewards. Returns the new ids. */
export function stepQuests(state: GameState): string[] {
  const newly: string[] = [];
  for (const q of QUESTS) {
    if (state.completedQuests.includes(q.id)) continue;
    if (q.done(state)) {
      state.completedQuests.push(q.id);
      payReward(state, q.reward);
      newly.push(q.id);
    }
  }
  return newly;
}
