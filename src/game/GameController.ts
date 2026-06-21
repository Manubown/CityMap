/**
 * GameController — orchestration glue between engine, renderer and UI store.
 *
 * Owns the GameState (now multiple regions), drives the fixed-timestep clock,
 * routes input to the ACTIVE region, manages region switching / claiming /
 * trade routes, and pushes UI snapshots. Nothing else mutates GameState.
 */

import { GameRenderer } from "../render/PixiApp";
import { SimClock, stepGame } from "../engine/tick";
import {
  activeRegion,
  buildingAt,
  claimRegion,
  createGame,
  getRegion,
  placeBuilding,
  removeBuilding,
} from "../engine/world";
import { getBuildingDef } from "../engine/buildings/registry";
import { clearSave, loadGame, saveGame } from "../engine/save/persistence";
import { housingCapacity, capacityOf, tierOf } from "../engine/systems/population";
import { laborDemand } from "../engine/systems/production";
import { addRoute as engineAddRoute, removeRoute as engineRemoveRoute } from "../engine/systems/routes";
import { availableUpgrades, canUnlock, unlockUpgrade } from "../engine/buildings/upgrades";
import { buyResource, sellResource, TRADE_BATCH } from "../engine/economy/trade";
import { npcBuy, npcSell, NPC_TRADE_BATCH } from "../engine/npc/trade";
import { AGE_NAMES, TECHS, canResearch, completeTech } from "../engine/research/techs";
import {
  SKILL_TREE,
  aggregateSkillEffects,
  canUnlockSkill,
  unlockSkill as applySkill,
  type SkillEffectDef,
} from "../engine/skills/skilltree";

function skillEffectLabel(e: SkillEffectDef): string {
  const pct = (m: number) => `${m >= 1 ? "+" : ""}${Math.round((m - 1) * 100)}%`;
  const parts: string[] = [];
  if (e.productionMult) parts.push(`${pct(e.productionMult)} production`);
  if (e.popGrowthMult) parts.push(`${pct(e.popGrowthMult)} growth`);
  if (e.taxMult) parts.push(`${pct(e.taxMult)} taxes`);
  if (e.researchMult) parts.push(`${pct(e.researchMult)} research`);
  if (e.claimCostMult) parts.push(`${pct(e.claimCostMult)} claim cost`);
  return parts.join(" · ");
}
import type { BuildingTypeId, GameState, GridPos, Region, ResourceId } from "../engine/types";
import { useGameStore, type SelectedInfo } from "../ui/store";

const STORE_PUSH_MS = 120;
const AUTOSAVE_MS = 20000;
const ROUTE_RATE = 0.5; // units moved per tick by a trade route

function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}

export class GameController {
  private renderer = new GameRenderer();
  private clock = new SimClock();
  private state!: GameState;
  private selectedId: string | null = null;
  private pushAccum = 0;
  private autosaveAccum = 0;
  private messageTimer: ReturnType<typeof setTimeout> | null = null;

  private get region(): Region {
    return activeRegion(this.state);
  }

  async start(parent: HTMLElement): Promise<void> {
    await this.renderer.init(parent);

    const loaded = await loadGame();
    this.state = loaded ?? createGame(randomSeed());
    this.renderer.attachRegion(this.region);

    this.renderer.onClickTile = (tile, button) => this.onClickTile(tile, button);
    this.renderer.onHoverTile = (tile) => this.onHover(tile);
    this.renderer.onCancel = () => this.cancelBuild();

    this.bindStoreActions();
    this.pushSnapshot();
    if (loaded) this.flashMessage("Loaded your saved game");

    this.renderer.app.ticker.add((t) => this.onFrame(t.deltaMS));
  }

  destroy(): void {
    if (this.messageTimer) clearTimeout(this.messageTimer);
    this.renderer.destroy();
  }

  // --- frame / sim --------------------------------------------------------

  private onFrame(dtMs: number): void {
    this.clock.advance(dtMs, () => stepGame(this.state));

    this.pushAccum += dtMs;
    if (this.pushAccum >= STORE_PUSH_MS) {
      this.pushAccum = 0;
      this.pushSnapshot();
    }

    this.autosaveAccum += dtMs;
    if (this.autosaveAccum >= AUTOSAVE_MS) {
      this.autosaveAccum = 0;
      void saveGame(this.state);
    }
  }

  // --- input routing ------------------------------------------------------

  private onClickTile(tile: GridPos, _button: number): void {
    const buildMode = useGameStore.getState().buildMode;
    if (buildMode) this.tryPlace(buildMode, tile);
    else this.selectAt(tile);
  }

  private onHover(tile: GridPos | null): void {
    useGameStore.setState({ hover: tile });
  }

  private tryPlace(type: BuildingTypeId, tile: GridPos): void {
    const def = getBuildingDef(type);
    // Global gates (tech/skill). Biome/terrain/deposit are handled by canPlace.
    if (def.requiresTech && !this.state.research.completed.includes(def.requiresTech)) {
      this.flashMessage("Research it first");
      return;
    }
    if (def.requiresSkill && !this.state.unlockedSkills.includes(def.requiresSkill)) {
      this.flashMessage("Unlock the skill first");
      return;
    }
    if (placeBuilding(this.region, type, tile.col, tile.row)) {
      this.renderer.syncEntities();
      this.pushSnapshot();
    } else {
      this.flashMessage("Can't build there");
    }
  }

  private selectAt(tile: GridPos): void {
    const b = buildingAt(this.region, tile.col, tile.row);
    this.selectedId = b?.id ?? null;
    this.renderer.setSelection(this.selectedId);
    this.pushSnapshot();
  }

  // --- store actions ------------------------------------------------------

  private bindStoreActions(): void {
    useGameStore.setState({
      setBuildMode: (type) => {
        this.selectedId = null;
        this.renderer.setSelection(null);
        this.renderer.setGhost(type);
        useGameStore.setState({ buildMode: type });
      },
      cancelBuild: () => this.cancelBuild(),
      clearSelection: () => {
        this.selectedId = null;
        this.renderer.setSelection(null);
        this.pushSnapshot();
      },
      deleteSelected: () => this.deleteSelected(),
      trade: (res, dir) => this.trade(res, dir),
      npcTrade: (npcId, res, dir) => this.npcTrade(npcId, res, dir),
      upgrade: (nodeId) => this.upgrade(nodeId),
      research: (techId) => this.research(techId),
      unlockSkill: (id) => this.unlockSkill(id),
      switchRegion: (id) => this.switchRegion(id),
      claimRegion: (id) => this.claim(id),
      addRoute: (from, to, res) => this.addRoute(from, to, res),
      removeRoute: (id) => this.removeRoute(id),
      save: () => void saveGame(this.state).then(() => this.flashMessage("Game saved")),
      newGame: () => this.newGame(),
      togglePause: () => {
        this.clock.setRunning(!this.clock.isRunning());
        useGameStore.setState({ running: this.clock.isRunning() });
      },
    });
  }

  private cancelBuild(): void {
    this.renderer.setGhost(null);
    useGameStore.setState({ buildMode: null });
  }

  private trade(res: ResourceId, dir: "buy" | "sell"): void {
    const ok =
      dir === "buy"
        ? buyResource(this.state, this.region, res, TRADE_BATCH)
        : sellResource(this.state, this.region, res, TRADE_BATCH);
    if (!ok) this.flashMessage(dir === "buy" ? "Not enough coins" : "Not enough to sell");
    this.pushSnapshot();
  }

  private npcTrade(npcId: string, res: ResourceId, dir: "buy" | "sell"): void {
    const npc = getRegion(this.state, npcId);
    if (!npc || npc.kind !== "npc") return;
    const ok =
      dir === "buy"
        ? npcBuy(this.state, npc, this.region, res, NPC_TRADE_BATCH)
        : npcSell(this.state, npc, this.region, res, NPC_TRADE_BATCH);
    if (!ok) this.flashMessage(dir === "buy" ? "Not enough coins" : "Not enough to sell");
    this.pushSnapshot();
  }

  private research(techId: string): void {
    if (completeTech(this.state, techId)) {
      this.flashMessage("Researched!");
      this.pushSnapshot();
    } else {
      this.flashMessage("Not enough research points");
    }
  }

  private unlockSkill(id: string): void {
    if (applySkill(this.state, id)) {
      this.flashMessage("Skill unlocked!");
      this.pushSnapshot();
    } else {
      this.flashMessage("Not enough skill points");
    }
  }

  private upgrade(nodeId: string): void {
    if (!this.selectedId) return;
    if (unlockUpgrade(this.state, this.region, this.selectedId, nodeId)) {
      this.renderer.syncEntities();
      this.pushSnapshot();
    } else {
      this.flashMessage("Can't afford that upgrade");
    }
  }

  private deleteSelected(): void {
    if (!this.selectedId) return;
    const b = this.region.buildings[this.selectedId];
    if (!b || b.type === "town_center") {
      this.flashMessage("The Town Center can't be removed");
      return;
    }
    removeBuilding(this.region, this.selectedId);
    this.selectedId = null;
    this.renderer.setSelection(null);
    this.renderer.syncEntities();
    this.pushSnapshot();
  }

  // --- regions / routes ---------------------------------------------------

  private switchRegion(id: string): void {
    const r = getRegion(this.state, id);
    if (!r || !r.claimed || id === this.state.activeRegionId) return;
    this.state.activeRegionId = id;
    this.selectedId = null;
    this.cancelBuild();
    this.renderer.attachRegion(this.region);
    this.renderer.setSelection(null);
    this.pushSnapshot();
  }

  private claim(id: string): void {
    if (claimRegion(this.state, id)) {
      this.state.activeRegionId = id;
      this.selectedId = null;
      this.cancelBuild();
      this.renderer.attachRegion(this.region);
      this.renderer.setSelection(null);
      this.pushSnapshot();
      this.flashMessage("New region claimed!");
    } else {
      this.flashMessage("Not enough coins to claim");
    }
  }

  private addRoute(from: string, to: string, res: ResourceId): void {
    if (engineAddRoute(this.state, from, to, res, ROUTE_RATE)) this.pushSnapshot();
    else this.flashMessage("That route already exists");
  }

  private removeRoute(id: string): void {
    engineRemoveRoute(this.state, id);
    this.pushSnapshot();
  }

  private async newGame(): Promise<void> {
    await clearSave();
    this.state = createGame(randomSeed());
    this.selectedId = null;
    this.cancelBuild();
    this.renderer.attachRegion(this.region);
    this.renderer.setSelection(null);
    this.pushSnapshot();
    this.flashMessage("New world generated");
  }

  // --- store snapshot -----------------------------------------------------

  private buildSelectedInfo(): SelectedInfo | null {
    if (!this.selectedId) return null;
    const b = this.region.buildings[this.selectedId];
    if (!b) return null;
    const def = getBuildingDef(b.type);
    const isResidence = !!def.housing;
    return {
      id: b.id,
      type: b.type,
      name: def.name,
      description: def.description,
      age: def.age,
      footprint: def.footprint,
      productivity: b.productivity,
      progress: b.progress,
      recipe: def.recipe
        ? {
            inputs: def.recipe.inputs,
            outputs: def.recipe.outputs,
            cycleTicks: def.recipe.cycleTicks,
            requiresAdjacent: def.recipe.requiresAdjacent,
          }
        : undefined,
      workers: def.workers,
      housing: def.housing,
      isMarket: def.trade ?? false,
      removable: b.type !== "town_center",
      isResidence,
      residents: isResidence ? Math.floor(b.residents) : undefined,
      capacity: isResidence ? Math.round(capacityOf(b)) : undefined,
      tierName: isResidence ? tierOf(b).name : undefined,
      needsKeys: isResidence ? (Object.keys(tierOf(b).needs) as ResourceId[]) : undefined,
      ownedUpgrades: (def.upgrades ?? [])
        .filter((n) => b.upgrades.includes(n.id))
        .map((n) => n.name),
      upgradeOptions: availableUpgrades(b).map((n) => ({
        id: n.id,
        name: n.name,
        description: n.description,
        cost: n.cost,
        coins: n.coins ?? 0,
        affordable: canUnlock(this.region, this.state.coins, b, n),
      })),
    };
  }

  private pushSnapshot(): void {
    const region = this.region;
    const skillEff = aggregateSkillEffects(this.state);
    const regions = this.state.regions.map((r) => ({
      id: r.id,
      name: r.name,
      claimed: r.claimed,
      claimCost: Math.round(r.claimCost * skillEff.claimCostMult),
      population: Math.floor(r.population),
      active: r.id === this.state.activeRegionId,
      biome: r.biome,
      kind: r.kind,
      discovered: r.discovered,
      worldPos: r.worldPos,
      npc: r.npc ? { reputation: r.npc.reputation, prices: r.npc.prices } : undefined,
    }));
    const routes = this.state.routes.map((rt) => ({
      id: rt.id,
      fromRegion: rt.fromRegion,
      toRegion: rt.toRegion,
      fromName: getRegion(this.state, rt.fromRegion)?.name ?? rt.fromRegion,
      toName: getRegion(this.state, rt.toRegion)?.name ?? rt.toRegion,
      resource: rt.resource,
      rate: rt.rate,
    }));

    const techs = TECHS.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      cost: t.cost,
      completed: this.state.research.completed.includes(t.id),
      available:
        !this.state.research.completed.includes(t.id) &&
        t.requires.every((r) => this.state.research.completed.includes(r)),
      affordable: canResearch(this.state, t.id),
    }));

    const skillNodes = SKILL_TREE.map((n) => ({
      id: n.id,
      name: n.name,
      description: n.description,
      cost: n.cost,
      pos: n.pos,
      requires: n.requires,
      effectLabel: skillEffectLabel(n.effects),
      unlocked: this.state.unlockedSkills.includes(n.id),
      available:
        !this.state.unlockedSkills.includes(n.id) &&
        n.requires.every((r) => this.state.unlockedSkills.includes(r)),
      affordable: canUnlockSkill(this.state, n.id),
    }));

    useGameStore.setState({
      stock: { ...region.stock },
      coins: Math.floor(this.state.coins),
      population: Math.floor(region.population),
      capacity: housingCapacity(region),
      laborSupply: Math.floor(region.population),
      laborDemand: laborDemand(region),
      tick: this.state.tick,
      buildingCount: Object.keys(region.buildings).length,
      running: this.clock.isRunning(),
      selected: this.buildSelectedInfo(),
      regions,
      routes,
      activeRegionId: this.state.activeRegionId,
      age: this.state.research.age,
      ageName: AGE_NAMES[this.state.research.age] ?? `Age ${this.state.research.age}`,
      researchPoints: Math.floor(this.state.research.points),
      completedTechs: [...this.state.research.completed],
      unlockedSkills: [...this.state.unlockedSkills],
      techs,
      skillPoints: this.state.skillPoints,
      skillNodes,
    });
  }

  private flashMessage(msg: string): void {
    useGameStore.setState({ message: msg });
    if (this.messageTimer) clearTimeout(this.messageTimer);
    this.messageTimer = setTimeout(() => useGameStore.setState({ message: null }), 2200);
  }
}
