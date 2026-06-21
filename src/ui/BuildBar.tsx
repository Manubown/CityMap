import { useGameStore } from "./store";
import { BUILDABLE_ORDER, BUILDINGS } from "../engine/buildings/registry";
import { canAfford } from "../engine/economy/resources";
import { resourceMapString } from "./format";

export function BuildBar() {
  const buildMode = useGameStore((s) => s.buildMode);
  const stock = useGameStore((s) => s.stock);
  const regions = useGameStore((s) => s.regions);
  const setBuildMode = useGameStore((s) => s.setBuildMode);
  const cancelBuild = useGameStore((s) => s.cancelBuild);

  const activeBiome = regions.find((r) => r.active)?.biome;

  return (
    <div className="build-bar panel">
      {BUILDABLE_ORDER.map((id) => {
        const def = BUILDINGS[id];
        const active = buildMode === id;
        const affordable = canAfford(stock, def.cost);
        const biomeLocked = !!def.requiresBiome && def.requiresBiome !== activeBiome;
        const costLabel = biomeLocked
          ? `🔒 ${def.requiresBiome}`
          : Object.keys(def.cost).length
            ? resourceMapString(def.cost)
            : "Free";
        const cls = biomeLocked ? " locked" : affordable ? "" : " poor";
        return (
          <button
            key={id}
            className={`build-btn${active ? " active" : ""}${cls}`}
            title={biomeLocked ? `Needs a ${def.requiresBiome} region` : def.description}
            disabled={biomeLocked}
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
  );
}
