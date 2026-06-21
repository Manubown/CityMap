import { useGameStore } from "./store";
import { RESOURCE_ORDER, RESOURCES } from "../engine/economy/resources";
import type { ResourceId } from "../engine/types";

export function ResourceBar() {
  const stock = useGameStore((s) => s.stock);
  const flows = useGameStore((s) => s.flows);
  const coins = useGameStore((s) => s.coins);
  const population = useGameStore((s) => s.population);
  const capacity = useGameStore((s) => s.capacity);
  const crowded = population > capacity;

  const net = (id: ResourceId) => flows.find((f) => f.id === id)?.netPerSec ?? 0;
  const amountClass = (id: ResourceId) => {
    if (net(id) >= -0.02) return "amount";
    return Math.floor(stock[id]) < 8 ? "amount crit" : "amount low"; // running out
  };

  const extras = (Object.keys(RESOURCES) as ResourceId[]).filter(
    (id) => !RESOURCE_ORDER.includes(id) && Math.floor(stock[id]) > 0,
  );

  const cell = (id: ResourceId, useImg: boolean) => {
    const n = net(id);
    const title = `${RESOURCES[id].name}${Math.abs(n) > 0.05 ? ` (${n > 0 ? "+" : ""}${n.toFixed(1)}/s)` : ""}`;
    return (
      <div className="resource" key={id} title={title}>
        {useImg ? (
          <img className="glyph-img" src={`/assets/ui/${id}.png`} alt={RESOURCES[id].name} />
        ) : (
          <span className="glyph">{RESOURCES[id].glyph}</span>
        )}
        <span className={amountClass(id)}>
          {Math.floor(stock[id])}
          {n < -0.02 && <span className="trend">▼</span>}
        </span>
      </div>
    );
  };

  return (
    <div className="resource-bar panel">
      {RESOURCE_ORDER.map((id) => cell(id, true))}
      {extras.map((id) => cell(id, false))}
      <div className="resource sep" title="Coins">
        <span className="glyph">🪙</span>
        <span className="amount">{coins}</span>
      </div>
      <div className="resource" title="Villagers / housing">
        <span className="glyph">{crowded ? "⚠️" : "👥"}</span>
        <span className="amount">
          {population}
          <small>/{capacity}</small>
        </span>
      </div>
    </div>
  );
}
