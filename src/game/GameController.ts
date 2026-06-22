/**
 * GameController — orchestration glue between engine, renderer and UI store.
 *
 * Owns the GameState (now multiple regions), drives the fixed-timestep clock,
 * routes input to the ACTIVE region, manages region switching / claiming /
 * trade routes, and pushes UI snapshots. Nothing else mutates GameState.
 */

import { GameRenderer } from "../render/PixiApp";
import { SimClock, stepGame, TICK_RATE } from "../engine/tick";
import { resourceFlows } from "../engine/stats";
import { RESOURCES } from "../engine/economy/resources";
import {
  activeRegion,
  buildingAt,
  claimRegion,
  clearCost,
  clearTile,
  createGame,
  getRegion,
  placeBuilding,
  placeStarters,
  removeBuilding,
} from "../engine/world";
import { getBuildingDef } from "../engine/buildings/registry";
import { clearSave, loadGame, saveGame, type SaveSlot } from "../engine/save/persistence";
import {
  housingCapacity,
  capacityOf,
  tierOf,
  hasService,
  TIERS,
} from "../engine/systems/population";
import type { ServiceType } from "../engine/types";

const SERVICE_LABELS: Record<ServiceType, string> = {
  water: "💧 Well",
  leisure: "🍺 Tavern",
  market: "🏪 Market Square",
};
import { laborDemand } from "../engine/systems/production";
import {
  addRoute as engineAddRoute,
  removeRoute as engineRemoveRoute,
  routeMultiplier,
} from "../engine/systems/routes";
import { availableUpgrades, canUnlock, unlockUpgrade } from "../engine/buildings/upgrades";
import { buyResource, sellResource, TRADE_BATCH } from "../engine/economy/trade";
import { npcBuy, npcSell } from "../engine/npc/trade";
import { addContract, removeContract } from "../engine/systems/contracts";
import { AGE_NAMES, TECHS, canResearch, completeTech } from "../engine/research/techs";
import { clockHM, calendar, isNight } from "../engine/time";
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
  private buildFacing = 0;
  private speed = 1;
  private minimapCanvas: HTMLCanvasElement | null = null;
  private minimapAccum = 0;
  private pushAccum = 0;
  private autosaveAccum = 0;
  private messageTimer: ReturnType<typeof setTimeout> | null = null;

  private get region(): Region {
    return activeRegion(this.state);
  }

  async start(parent: HTMLElement): Promise<void> {
    await this.renderer.init(parent);

    const loaded = await loadGame();
    if (loaded) {
      this.state = loaded;
    } else {
      this.state = createGame(randomSeed());
      placeStarters(this.state.regions[0]); // new players start with a few buildings
    }
    this.renderer.attachRegion(this.region);

    this.renderer.onClickTile = (tile, button) => this.onClickTile(tile, button);
    this.renderer.onHoverTile = (tile) => this.onHover(tile);
    this.renderer.onCancel = () => this.cancelBuild();
    this.renderer.onRotate = () => this.rotateBuild();

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
    this.clock.advance(dtMs * this.speed, () => stepGame(this.state));
    this.renderer.updateAgents(this.clock.fraction());
    this.renderer.setDayNight(this.state.tick);

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

    this.minimapAccum += dtMs;
    if (this.minimapCanvas && this.minimapAccum >= 200) {
      this.minimapAccum = 0;
      const ctx = this.minimapCanvas.getContext("2d");
      if (ctx) this.renderer.drawMinimap(ctx, this.minimapCanvas.width, this.minimapCanvas.height);
    }
  }

  // --- input routing ------------------------------------------------------

  private onClickTile(tile: GridPos, _button: number): void {
    const { buildMode, clearMode } = useGameStore.getState();
    if (clearMode) this.tryClear(tile);
    else if (buildMode) this.tryPlace(buildMode, tile);
    else this.selectAt(tile);
  }

  private tryClear(tile: GridPos): void {
    const cost = clearCost(this.region, tile.col, tile.row);
    if (cost < 0) {
      this.flashMessage("Nothing to clear here");
      return;
    }
    if (this.state.coins < cost) {
      this.flashMessage(`Clearing costs 🪙${cost}`);
      return;
    }
    clearTile(this.state, this.region, tile.col, tile.row);
    this.renderer.rebuildTerrain();
    this.pushSnapshot();
  }

  private toggleClear(): void {
    const next = !useGameStore.getState().clearMode;
    if (next) {
      this.selectedId = null;
      this.renderer.setSelection(null);
      this.renderer.setGhost(null);
    }
    useGameStore.setState({ clearMode: next, buildMode: null });
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
    const placed = placeBuilding(this.region, type, tile.col, tile.row, {
      facing: this.buildFacing,
    });
    if (placed) {
      placed.built = false; // a player build starts as a construction site
      placed.buildProgress = 0;
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
        this.buildFacing = 0;
        this.renderer.setSelection(null);
        this.renderer.setGhost(type, this.buildFacing);
        useGameStore.setState({ buildMode: type, clearMode: false });
      },
      cancelBuild: () => this.cancelBuild(),
      rotateBuild: () => this.rotateBuild(),
      toggleClear: () => this.toggleClear(),
      registerMinimap: (c) => {
        this.minimapCanvas = c;
      },
      minimapJump: (fx, fy) => this.renderer.panToFraction(fx, fy),
      clearSelection: () => {
        this.selectedId = null;
        this.renderer.setSelection(null);
        this.pushSnapshot();
      },
      deleteSelected: () => this.deleteSelected(),
      trade: (res, dir) => this.trade(res, dir),
      npcTrade: (npcId, res, dir, qty) => this.npcTrade(npcId, res, dir, qty),
      setupDeal: (npcId, res, dir, qty, every) => this.setupDeal(npcId, res, dir, qty, every),
      cancelDeal: (id) => this.cancelDeal(id),
      upgrade: (nodeId) => this.upgrade(nodeId),
      research: (techId) => this.research(techId),
      unlockSkill: (id) => this.unlockSkill(id),
      switchRegion: (id) => this.switchRegion(id),
      claimRegion: (id) => this.claim(id),
      addRoute: (from, to, res, rate) => this.addRoute(from, to, res, rate),
      removeRoute: (id) => this.removeRoute(id),
      save: () => void saveGame(this.state).then(() => this.flashMessage("Game saved")),
      newGame: () => this.newGame(),
      togglePause: () => {
        this.clock.setRunning(!this.clock.isRunning());
        useGameStore.setState({ running: this.clock.isRunning() });
      },
      setSpeed: (n) => {
        this.speed = n;
        if (!this.clock.isRunning()) this.clock.setRunning(true);
        useGameStore.setState({ gameSpeed: n, running: true });
      },
      saveSlot: (slot) => this.saveSlot(slot),
      loadSlot: (slot) => this.loadSlot(slot),
    });
  }

  private saveSlot(slot: SaveSlot): void {
    void saveGame(this.state, slot).then(() =>
      this.flashMessage(slot === "auto" ? "Game saved" : `Saved to slot ${slot}`),
    );
  }

  private async loadSlot(slot: SaveSlot): Promise<void> {
    const loaded = await loadGame(slot);
    if (!loaded) {
      this.flashMessage("That slot is empty or incompatible");
      return;
    }
    this.state = loaded;
    this.selectedId = null;
    this.cancelBuild();
    this.renderer.attachRegion(this.region);
    this.renderer.setSelection(null);
    useGameStore.setState({ menuOpen: false });
    this.pushSnapshot();
    this.flashMessage(slot === "auto" ? "Autosave loaded" : `Loaded slot ${slot}`);
  }

  private cancelBuild(): void {
    this.renderer.setGhost(null);
    useGameStore.setState({ buildMode: null, clearMode: false });
  }

  private rotateBuild(): void {
    const buildMode = useGameStore.getState().buildMode;
    if (!buildMode) return;
    this.buildFacing = (this.buildFacing + 1) % 4;
    this.renderer.setGhost(buildMode, this.buildFacing);
  }

  private trade(res: ResourceId, dir: "buy" | "sell"): void {
    const ok =
      dir === "buy"
        ? buyResource(this.state, this.region, res, TRADE_BATCH)
        : sellResource(this.state, this.region, res, TRADE_BATCH);
    if (!ok) this.flashMessage(dir === "buy" ? "Not enough coins" : "Not enough to sell");
    this.pushSnapshot();
  }

  /** A region can trade only if it has a built trading building (Market). */
  private hasMarket(region: Region): boolean {
    return Object.values(region.buildings).some((b) => getBuildingDef(b.type).trade);
  }

  private npcTrade(npcId: string, res: ResourceId, dir: "buy" | "sell", qty: number): void {
    const npc = getRegion(this.state, npcId);
    if (!npc || npc.kind !== "npc") return;
    if (!this.hasMarket(this.region)) {
      this.flashMessage("Build a Trading Post in this city to trade");
      return;
    }
    const ok =
      dir === "buy"
        ? npcBuy(this.state, npc, this.region, res, qty)
        : npcSell(this.state, npc, this.region, res, qty);
    if (!ok) this.flashMessage(dir === "buy" ? "Not enough coins" : "Not enough to sell");
    this.pushSnapshot();
  }

  private setupDeal(
    npcId: string,
    res: ResourceId,
    dir: "buy" | "sell",
    qty: number,
    everyTicks: number,
  ): void {
    const npc = getRegion(this.state, npcId);
    if (!npc || npc.kind !== "npc") return;
    if (!this.hasMarket(this.region)) {
      this.flashMessage("Build a Trading Post in this city to trade");
      return;
    }
    addContract(this.state, npcId, this.region.id, res, dir, qty, everyTicks);
    this.flashMessage(`Deal set: ${dir} ${qty} ${res}`);
    this.pushSnapshot();
  }

  private cancelDeal(id: string): void {
    removeContract(this.state, id);
    this.flashMessage("Deal cancelled");
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

  private addRoute(from: string, to: string, res: ResourceId, rate: number): void {
    const r = rate > 0 ? rate : ROUTE_RATE;
    if (engineAddRoute(this.state, from, to, res, r)) this.pushSnapshot();
    else this.flashMessage("That route already exists");
  }

  private removeRoute(id: string): void {
    engineRemoveRoute(this.state, id);
    this.pushSnapshot();
  }

  private async newGame(): Promise<void> {
    await clearSave();
    this.state = createGame(randomSeed());
    placeStarters(this.state.regions[0]);
    this.selectedId = null;
    this.cancelBuild();
    this.renderer.attachRegion(this.region);
    this.renderer.setSelection(null);
    this.pushSnapshot();
    this.flashMessage("New world generated");
  }

  // --- store snapshot -----------------------------------------------------

  private buildFlows(region: Region) {
    const rf = resourceFlows(this.state, region);
    return (Object.keys(RESOURCES) as ResourceId[]).map((id) => {
      const produced = rf[id].produced * TICK_RATE;
      const consumed = rf[id].consumed * TICK_RATE;
      return {
        id,
        name: RESOURCES[id].name,
        glyph: RESOURCES[id].glyph,
        stock: Math.floor(region.stock[id]),
        producedPerSec: produced,
        consumedPerSec: consumed,
        netPerSec: produced - consumed,
      };
    });
  }

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
      built: b.built,
      buildProgress: b.buildProgress,
      upgrading: b.pendingUpgrade ? b.pendingUpgrade.progress : undefined,
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
      nextTierName: isResidence ? TIERS[b.tier]?.name : undefined,
      nextServices:
        isResidence && TIERS[b.tier]
          ? (TIERS[b.tier].services ?? []).map((s) => ({
              label: SERVICE_LABELS[s],
              met: hasService(this.region, s),
            }))
          : undefined,
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
    const routes = this.state.routes.map((rt) => {
      const rf = getRegion(this.state, rt.fromRegion);
      const rtt = getRegion(this.state, rt.toRegion);
      const mult = rf && rtt ? routeMultiplier(rf, rtt) : 1;
      return {
        id: rt.id,
        fromRegion: rt.fromRegion,
        toRegion: rt.toRegion,
        fromName: rf?.name ?? rt.fromRegion,
        toName: rtt?.name ?? rt.toRegion,
        resource: rt.resource,
        rate: rt.rate,
        effectiveRate: rt.rate * mult,
      };
    });

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
      gameSpeed: this.speed,
      selected: this.buildSelectedInfo(),
      canTrade: this.hasMarket(region),
      flows: this.buildFlows(region),
      regions,
      routes,
      contracts: this.state.contracts.map((c) => ({
        id: c.id,
        npcId: c.npcId,
        resource: c.resource,
        dir: c.dir,
        qty: c.qty,
        everyTicks: c.everyTicks,
      })),
      activeRegionId: this.state.activeRegionId,
      timeHour: clockHM(this.state.tick).hour,
      timeMinute: clockHM(this.state.tick).minute,
      dayNum: calendar(this.state.tick).day,
      monthNum: calendar(this.state.tick).month,
      dayOfMonth: calendar(this.state.tick).dayOfMonth,
      isNight: isNight(this.state.tick),
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
