import { useGameStore } from "./store";

export function RegionTabs() {
  const regions = useGameStore((s) => s.regions);
  const switchRegion = useGameStore((s) => s.switchRegion);
  const claimRegion = useGameStore((s) => s.claimRegion);
  const coins = useGameStore((s) => s.coins);

  if (regions.length <= 1) return null;

  return (
    <div className="region-tabs panel">
      {regions.map((r) =>
        r.claimed ? (
          <button
            key={r.id}
            className={`region-tab${r.active ? " active" : ""}`}
            onClick={() => switchRegion(r.id)}
          >
            🏙 {r.name}{" "}
            <small>
              {r.biome} · 👥 {r.population}
            </small>
          </button>
        ) : (
          <button
            key={r.id}
            className={`region-tab claim${coins >= r.claimCost ? "" : " poor"}`}
            onClick={() => claimRegion(r.id)}
            title="Claim this abandoned village"
          >
            🏚 {r.name} <small>Claim 🪙{r.claimCost}</small>
          </button>
        ),
      )}
    </div>
  );
}
