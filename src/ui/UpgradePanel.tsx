import { useGameStore } from "./store";
import { resourceMapString } from "./format";
import type { UpgradeOption } from "./store";

function costLabel(o: UpgradeOption): string {
  const goods = Object.keys(o.cost).length ? resourceMapString(o.cost) : "";
  const coins = o.coins ? `🪙 ${o.coins}` : "";
  return [goods, coins].filter(Boolean).join("  ");
}

export function UpgradePanel() {
  const selected = useGameStore((s) => s.selected);
  const upgrade = useGameStore((s) => s.upgrade);
  if (!selected) return null;
  const { ownedUpgrades, upgradeOptions } = selected;
  if (ownedUpgrades.length === 0 && upgradeOptions.length === 0) return null;

  return (
    <div className="upgrades">
      <div className="up-head">Skill tree</div>
      {ownedUpgrades.map((name) => (
        <div className="up-owned" key={name}>
          ✓ {name}
        </div>
      ))}
      {upgradeOptions.map((o) => (
        <button
          key={o.id}
          className="up-opt"
          disabled={!o.affordable}
          onClick={() => upgrade(o.id)}
          title={o.description}
        >
          <span className="up-name">{o.name}</span>
          <span className="up-cost">{costLabel(o)}</span>
        </button>
      ))}
    </div>
  );
}
