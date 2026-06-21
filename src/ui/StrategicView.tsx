import { useState } from "react";
import { useGameStore, type RegionInfo } from "./store";
import type { BiomeId, ResourceId } from "../engine/types";
import { RESOURCES } from "../engine/economy/resources";

const BIOME_COLORS: Record<BiomeId, string> = {
  plains: "#8bbf5a",
  forest: "#3f7d3a",
  mountains: "#9aa0a6",
  wetland: "#5f7d52",
  desert: "#d9c89a",
  coast: "#6fb0c9",
};

const HEX = 72;
const SQRT3 = Math.sqrt(3);
const hexToPixel = (q: number, r: number) => ({ x: HEX * 1.5 * q, y: HEX * SQRT3 * (r + q / 2) });

const TRADEABLE: ResourceId[] = [
  "wood",
  "stone",
  "food",
  "tools",
  "grain",
  "game",
  "ore",
  "copper",
  "tin",
  "bronze",
];

const NPC_BATCH = 10;

export function StrategicView() {
  const regions = useGameStore((s) => s.regions);
  const routes = useGameStore((s) => s.routes);
  const coins = useGameStore((s) => s.coins);
  const setView = useGameStore((s) => s.setView);
  const switchRegion = useGameStore((s) => s.switchRegion);
  const claimRegion = useGameStore((s) => s.claimRegion);
  const npcTrade = useGameStore((s) => s.npcTrade);
  const [selId, setSelId] = useState<string | null>(null);

  const nodes = regions.filter((r) => r.discovered);
  const pts = new Map(nodes.map((n) => [n.id, hexToPixel(n.worldPos.q, n.worldPos.r)]));
  const xs = [...pts.values()].map((p) => p.x);
  const ys = [...pts.values()].map((p) => p.y);
  const pad = 90;
  const minX = Math.min(...xs) - pad;
  const minY = Math.min(...ys) - pad;
  const vb = `${minX} ${minY} ${Math.max(...xs) - minX + pad} ${Math.max(...ys) - minY + pad}`;
  const sel = nodes.find((n) => n.id === selId) ?? null;

  return (
    <div className="strategic">
      <div className="strat-head panel">
        <button className="strat-back" onClick={() => setView("city")}>
          ← Back to city
        </button>
        <span className="strat-title">World Map</span>
        <span className="strat-coins">🪙 {coins}</span>
      </div>

      <div className="strat-body">
        <svg className="strat-map" viewBox={vb} preserveAspectRatio="xMidYMid meet">
          {routes.map((rt) => {
            const a = pts.get(rt.fromRegion);
            const b = pts.get(rt.toRegion);
            if (!a || !b) return null;
            return <line key={rt.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="strat-route" />;
          })}
          {nodes.map((n) => {
            const p = pts.get(n.id)!;
            const cls = `strat-node ${n.kind}${n.active ? " active" : ""}${n.id === selId ? " selected" : ""}`;
            return (
              <g
                key={n.id}
                transform={`translate(${p.x},${p.y})`}
                className={cls}
                onClick={() => setSelId(n.id)}
              >
                <circle r={32} fill={BIOME_COLORS[n.biome]} />
                <text className="node-icon" y={9} textAnchor="middle">
                  {n.kind === "npc" ? "🛖" : n.claimed ? "🏙" : "🏚"}
                </text>
                <text className="node-label" y={54} textAnchor="middle">
                  {n.name}
                </text>
              </g>
            );
          })}
        </svg>

        <div className="strat-panel panel">
          {!sel ? (
            <p className="sp-desc">Select a location on the map.</p>
          ) : (
            <NodeDetail
              node={sel}
              coins={coins}
              onEnter={() => {
                switchRegion(sel.id);
                setView("city");
              }}
              onClaim={() => {
                claimRegion(sel.id);
                setView("city");
              }}
              onTrade={npcTrade}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function NodeDetail({
  node,
  coins,
  onEnter,
  onClaim,
  onTrade,
}: {
  node: RegionInfo;
  coins: number;
  onEnter: () => void;
  onClaim: () => void;
  onTrade: (npcId: string, res: ResourceId, dir: "buy" | "sell") => void;
}) {
  return (
    <div className="node-detail">
      <h3>{node.name}</h3>
      <div className="sp-row">
        <span>Biome</span>
        <b>{node.biome}</b>
      </div>

      {node.claimed && (
        <>
          <div className="sp-row">
            <span>Population</span>
            <b>👥 {node.population}</b>
          </div>
          <button className="tech-btn enter" onClick={onEnter}>
            {node.active ? "Return to city →" : "Enter city →"}
          </button>
        </>
      )}

      {node.kind === "site" && (
        <>
          <p className="sp-desc">An unclaimed {node.biome} site — found a new colony here.</p>
          <button className="buy-city" disabled={coins < node.claimCost} onClick={onClaim}>
            Buy city · 🪙 {node.claimCost}
          </button>
        </>
      )}

      {node.kind === "npc" && node.npc && (
        <>
          <div className="sp-row">
            <span>Reputation</span>
            <b>{node.npc.reputation}</b>
          </div>
          <div className="npc-trade">
            {TRADEABLE.map((id) => {
              const price = node.npc!.prices[id];
              return (
                <div className="trade-row" key={id}>
                  <span className="t-glyph" title={RESOURCES[id].name}>
                    {RESOURCES[id].glyph}
                  </span>
                  <button className="t-sell" onClick={() => onTrade(node.id, id, "sell")}>
                    Sell +{price.sell * NPC_BATCH}
                  </button>
                  <button
                    className="t-buy"
                    disabled={coins < price.buy * NPC_BATCH}
                    onClick={() => onTrade(node.id, id, "buy")}
                  >
                    Buy −{price.buy * NPC_BATCH}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
