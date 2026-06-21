import { useState } from "react";
import { useGameStore } from "./store";
import {
  BUILDABLE_ORDER,
  BUILDINGS,
  BUILDING_CATEGORY,
  CATEGORY_ORDER,
} from "../engine/buildings/registry";
import type { BuildingDef } from "../engine/buildings/registry";
import { canAfford } from "../engine/economy/resources";
import { resourceMapString } from "./format";
import type { BuildingCategory, BuildingTypeId } from "../engine/types";

const CATEGORY_LABEL: Record<BuildingCategory, string> = {
  housing: "Homes",
  food: "Food",
  extraction: "Resources",
  crafting: "Crafting",
  logistics: "Trade",
};

/** Human placement/usage facts for the hover card. */
function buildingFacts(def: BuildingDef, techName: (id: string) => string): string[] {
  const reqs: string[] = [];
  if (def.requiresTech) reqs.push(`🔬 Needs research: ${techName(def.requiresTech)}`);
  if (def.requiresBiome) reqs.push(`🌍 Only in ${def.requiresBiome} regions`);
  if (def.recipe?.requiresAdjacent)
    reqs.push(`📍 Place next to ${def.recipe.requiresAdjacent.terrain}`);
  if (def.recipe?.requiresDepositAdjacent)
    reqs.push(`⛏ Place next to a ${def.recipe.requiresDepositAdjacent} deposit`);
  reqs.push(`🏗 Builds on ${def.buildableOn.join(" / ")}`);
  if (def.workers) reqs.push(`👷 Needs ${def.workers} workers`);
  if (def.housing) reqs.push(`🏠 Houses up to ${def.housing}`);
  return reqs;
}

function DetailCard({ def, techName }: { def: BuildingDef; techName: (id: string) => string }) {
  const out = def.recipe && Object.keys(def.recipe.outputs).length ? def.recipe.outputs : null;
  const inp = def.recipe && Object.keys(def.recipe.inputs).length ? def.recipe.inputs : null;
  const cost = Object.keys(def.cost).length ? resourceMapString(def.cost) : "Free";
  return (
    <div className="build-detail panel">
      <div className="bd-head">
        <b>{def.name}</b>
        <span className="bd-cost">🔨 {cost}</span>
      </div>
      <p className="bd-desc">{def.description}</p>
      {out && (
        <div className="bd-line">
          Makes <b>{resourceMapString(out)}</b>
          {inp && (
            <>
              {" "}
              from <b>{resourceMapString(inp)}</b>
            </>
          )}
        </div>
      )}
      <ul className="bd-reqs">
        {buildingFacts(def, techName).map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
    </div>
  );
}

export function BuildBar() {
  const buildMode = useGameStore((s) => s.buildMode);
  const clearMode = useGameStore((s) => s.clearMode);
  const stock = useGameStore((s) => s.stock);
  const regions = useGameStore((s) => s.regions);
  const completedTechs = useGameStore((s) => s.completedTechs);
  const unlockedSkills = useGameStore((s) => s.unlockedSkills);
  const techs = useGameStore((s) => s.techs);
  const selected = useGameStore((s) => s.selected);
  const setBuildMode = useGameStore((s) => s.setBuildMode);
  const cancelBuild = useGameStore((s) => s.cancelBuild);
  const toggleClear = useGameStore((s) => s.toggleClear);
  const [cat, setCat] = useState<BuildingCategory>("food");
  const [hovered, setHovered] = useState<BuildingTypeId | null>(null);

  const activeBiome = regions.find((r) => r.active)?.biome;
  const techName = (id: string) => techs.find((t) => t.id === id)?.name ?? id;
  const buildings = BUILDABLE_ORDER.filter((id) => BUILDING_CATEGORY[id] === cat);
  const detailId = hovered ?? buildMode;

  return (
    <>
      {detailId && !selected && <DetailCard def={BUILDINGS[detailId]} techName={techName} />}

      <div className="build-area">
        <div className="cat-tabs panel">
        {CATEGORY_ORDER.map((c) => (
          <button
            key={c}
            className={`cat-tab${c === cat ? " active" : ""}`}
            onClick={() => setCat(c)}
          >
            {CATEGORY_LABEL[c]}
          </button>
        ))}
        <button
          className={`cat-tab clear-tab${clearMode ? " active" : ""}`}
          onClick={toggleClear}
          title="Clear forest / rock tiles to flat dirt so you can build there"
        >
          🪓 Clear
        </button>
      </div>

      <div className="build-bar panel">
        {buildings.map((id) => {
          const def = BUILDINGS[id];
          const active = buildMode === id;
          const affordable = canAfford(stock, def.cost);
          const biomeLocked = !!def.requiresBiome && def.requiresBiome !== activeBiome;
          const techLocked = !!def.requiresTech && !completedTechs.includes(def.requiresTech);
          const skillLocked = !!def.requiresSkill && !unlockedSkills.includes(def.requiresSkill);
          const locked = biomeLocked || techLocked || skillLocked;

          const costLabel = biomeLocked
            ? `🔒 ${def.requiresBiome}`
            : techLocked
              ? `🔬 ${techName(def.requiresTech!)}`
              : skillLocked
                ? "🔒 skill"
                : Object.keys(def.cost).length
                  ? resourceMapString(def.cost)
                  : "Free";

          return (
            <button
              key={id}
              className={`build-btn${active ? " active" : ""}${locked ? " locked" : affordable ? "" : " poor"}`}
              disabled={locked}
              onMouseEnter={() => setHovered(id)}
              onMouseLeave={() => setHovered((h) => (h === id ? null : h))}
              onClick={() => (active ? cancelBuild() : setBuildMode(id))}
            >
              <img
                className="swatch-img"
                src={`/assets/buildings/${def.spriteAlias ?? id}.png`}
                alt={def.name}
              />
              <span className="b-name">{def.name}</span>
              <span className="b-cost">{costLabel}</span>
            </button>
          );
        })}
        </div>
      </div>
    </>
  );
}
