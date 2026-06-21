# CityMap — Game Design Document

> Living document. Slice 1 implements only the Stone Age sandbox (Part 6). The
> rest is the agreed direction so every early decision points the right way.

## 1. Vision

Build and connect multiple cities into a working inter-city **economy**, growing
settlements from the **Stone Age** to **Mega Cities**. You don't just paint a
city — you make goods flow: production chains feed population needs, surplus
becomes trade, and trade funds expansion into new regions.

**Inspirations**

- **Anno 1800** — production chains + tiered population needs as the economic engine.
- **Cities: Skylines** — scale, organic growth, the satisfaction of a city evolving.
- **Transport Fever 2** — logistics and trade routes between places as real gameplay.

## 2. Design pillars

1. **Living economy.** Goods come from multi-step chains; population tiers demand
   them. Supply/demand drives every decision. Nothing is free — build cost + upkeep,
   paid from population taxes.
2. **Connected regions.** The world is several discrete maps, linked by transport
   and trade with real travel time + capacity. Expansion = claiming new regions.
3. **Tangible growth.** The same plot visibly evolves hut → townhouse → tenement →
   skyscraper as ages advance.
4. **Meaningful logistics.** Moving goods matters: warehouses, roads, routes.
5. **Readable depth.** Deep systems, legible UI — bottlenecks always glanceable.

## 3. Progression — the Age ladder

Seven ages. Each adds a residential tier, new needs, and a new production tier.

| # | Age | Flavor | New core-loop element |
|---|-----|--------|----------------------|
| 1 | Stone Age | huts, foraging | raw gathering (wood/stone/food) |
| 2 | Bronze / Early Settlement | first villages | basic processing (tools, pottery) |
| 3 | Antiquity / Iron | towns | services, markets, money matters |
| 4 | Medieval | walled towns, guilds | luxury goods, multi-tier needs |
| 5 | Industrial (Anno 1800 era) | factories | deep chains, pollution, workforce |
| 6 | Modern | 20th-c. city | utilities, transit, density |
| 7 | Mega City | skyscrapers | megastructures, global trade |

Advancing an age is gated by sustaining a population tier (enough satisfied needs),
which unlocks the next tier's buildings and goods.

## 4. Economy model

- **Resources** flow through chains: raw extraction → processing → finished goods.
- **Population & needs (Anno-style).** Residential buildings house N pop at a tier;
  each tier has a needs basket (goods + services). Meeting needs upgrades houses
  (more pop, more tax, more demanding needs); unmet needs downgrade / cause unrest.
- **Money** comes from taxes, spent on construction + upkeep. This macro loop gates
  how fast you expand.
- **Logistics.** Slice 1 uses one global stockpile. Later, goods live in warehouses
  and must be *moved*: road networks within a region, trade routes between regions.

## 5. Multi-map expansion (the early-game hook)

- Start on **Region 1**. **NPC settlements** exist as trade partners with their own
  stock, prices, and reputation.
- **Abandoned / ruined village sites** are claimable: pay money/resources to claim a
  site → unlock a new buildable **Region 2**.
- Regions connect via **trade routes** (road/sea) with travel time + capacity. The
  first expansion milestone is claiming Region 2 and running a route between regions.
- **NPC AI** produces, consumes, prices goods, and holds reputation that affects deals.

## 6. Slice 1 — the first playable (implemented)

A single-region sandbox proving the core loop.

- **Map:** procedural isometric region (grass, forest, water, rock, dirt), with a
  clear buildable area around the centre and forest/rock within reach.
- **Camera:** drag / WASD pan, wheel zoom, clamped to the map.
- **Build:** pick a building, preview its footprint (green/red validity), click to
  place; select to inspect; demolish (except the Town Center).
- **Economy tick:** a fixed-timestep simulation runs production. Raw extractors
  (Forester needs forest, Quarry needs rock, Gatherer forages) feed a global
  stockpile; the **Toolmaker** turns Wood into Tools — the first 2-step chain.
- **Persistence:** autosave + manual save to IndexedDB; reload restores the city.

**Stone-Age content**

| Building | Footprint | Cost | Produces | Requirement |
|----------|-----------|------|----------|-------------|
| Town Center | 2×2 | free | — | placed at start |
| Hut | 1×1 | 🪵5 | — (housing placeholder) | — |
| Forester's Hut | 1×1 | 🪵10 | Wood | forest adjacent |
| Gatherer's Hut | 1×1 | 🪵8 | Food | — |
| Stone Quarry | 1×1 | 🪵12 | Stone | rock adjacent |
| Toolmaker | 1×1 | 🪵15 🪨10 | Tools (from 🪵2) | — |
| Storage Hut | 2×1 | 🪵20 | — (flavour) | — |

Resources: **Wood, Stone, Food, Tools**. Sim runs at 4 ticks/sec.

## 7. Architecture (see README + source)

- `src/engine/**` — engine-agnostic simulation (deterministic, testable). No PixiJS/React.
- `src/render/**` — PixiJS v8: camera, picking, chunked terrain, depth-sorted entities, overlay.
- `src/ui/**` — React HUD + Zustand mirror.
- `src/game/GameController.ts` — the glue: owns state, drives the tick, routes input,
  pushes UI snapshots.

## 7b. Slice 2 — the economy loop (implemented)

The sandbox now has a working core loop:

- **Villagers & housing.** Town Center + Huts provide housing capacity; population
  grows toward capacity while fed and shrinks when food runs out
  (`src/engine/systems/population.ts`).
- **Workforce.** Production buildings require workers drawn from the villager pool;
  if demand exceeds population, every building scales down by a global labour ratio
  (`src/engine/systems/production.ts`).
- **Taxes & coins.** Fed villagers pay coins over time — the currency for trade.
- **Trading.** A **Trading Post** lets you buy/sell goods for coins at a merchant
  spread (`src/engine/economy/trade.ts`, `src/ui/TradePanel.tsx`).
- **Terrain** is detailed low-poly vector tiles (elevation shading, decorations).

The loop: build housing → feed villagers → villagers staff production → sell surplus
for coins → buy what you lack → grow.

## 7c. Slice 3 — depth (implemented)

- **Residential tiers + specific needs.** Each residence holds residents at a tier:
  **Settlers** (Food) → **Villagers** (Food + Tools) → **Citizens** (Food + Tools +
  Stone). Meeting a house's needs near capacity upgrades its tier (more capacity +
  tax, more demands); losing food decays it. (`systems/population.ts`)
- **Per-building skill trees.** Every placed building can be upgraded individually
  along a small tree — extractors (speed → output → fewer workers), Toolmaker
  (speed → material savings → output), residences (housing, taxes). Effects
  aggregate and feed production/labour/housing. (`buildings/upgrades.ts`,
  `ui/UpgradePanel.tsx`)

## 7d. Slice 4 — multiple regions (implemented)

The headline expansion feature is in:

- **Regions.** `GameState` holds multiple `Region`s, each with its own map,
  buildings, **stockpile and population**. Coins are a single **global treasury**.
  You view/build one region at a time (region tabs switch the active one).
- **Claiming.** You start with a **Homeland** plus a claimable **Abandoned
  Village**; spend coins to claim it → it's founded with a Town Center, starting
  goods and settlers, and becomes buildable.
- **Trade routes.** Standing orders move one good per tick from one region's
  stock to another's (`systems/routes.ts`) — ship a resource-rich colony's
  surplus back to your homeland. Managed in the Trade Routes panel.
- Every claimed region runs production + population each tick; taxes flow to the
  global treasury.

> Next for regions: more claimable sites, region-specific resources/biomes,
> route travel-time + capacity, and visible transport.

## 8. Roadmap from here

Multi-tier needs (goods baskets that upgrade housing) → building upkeep →
warehouses + road logistics → NPC settlements with fluctuating prices →
**claim a 2nd region** (abandoned-village hook) → inter-region trade routes →
further ages → animated villager agents → (later) a Node backend for cloud
saves / multiplayer.
