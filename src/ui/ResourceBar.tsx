import { useGameStore } from "./store";
import { RESOURCE_ORDER, RESOURCES } from "../engine/economy/resources";

export function ResourceBar() {
  const stock = useGameStore((s) => s.stock);
  const coins = useGameStore((s) => s.coins);
  const population = useGameStore((s) => s.population);
  const capacity = useGameStore((s) => s.capacity);
  const crowded = population > capacity;
  return (
    <div className="resource-bar panel">
      {RESOURCE_ORDER.map((id) => (
        <div className="resource" key={id} title={RESOURCES[id].name}>
          <img className="glyph-img" src={`/assets/ui/${id}.png`} alt={RESOURCES[id].name} />
          <span className="amount">{Math.floor(stock[id])}</span>
        </div>
      ))}
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
