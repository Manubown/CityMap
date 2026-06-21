import { useState } from "react";
import { useGameStore } from "./store";
import { RESOURCE_ORDER, RESOURCES } from "../engine/economy/resources";
import { TICK_RATE } from "../engine/tick";
import type { ResourceId } from "../engine/types";

type Tab = "resources" | "population" | "routes" | "trade";
const TAB_LABEL: Record<Tab, string> = {
  resources: "Resources",
  population: "Population",
  routes: "Trade Routes",
  trade: "Trading",
};

const fmt = (n: number) => (Math.abs(n) < 0.005 ? "—" : n.toFixed(2));
const netClass = (n: number) => (n > 0.005 ? "pos" : n < -0.005 ? "neg" : "");

export function StatsView() {
  const setView = useGameStore((s) => s.setView);
  const [tab, setTab] = useState<Tab>("resources");

  return (
    <div className="stats-win">
      <div className="strat-head panel">
        <button className="strat-back" onClick={() => setView("city")}>
          ← Back to city
        </button>
        <span className="strat-title">📊 Statistics</span>
      </div>

      <div className="stats-tabs panel">
        {(Object.keys(TAB_LABEL) as Tab[]).map((t) => (
          <button
            key={t}
            className={`stats-tab${t === tab ? " active" : ""}`}
            onClick={() => setTab(t)}
          >
            {TAB_LABEL[t]}
          </button>
        ))}
      </div>

      <div className="stats-body panel">
        {tab === "resources" && <ResourcesTab />}
        {tab === "population" && <PopulationTab />}
        {tab === "routes" && <RoutesTab />}
        {tab === "trade" && <TradeTab />}
      </div>
    </div>
  );
}

function ResourcesTab() {
  const flows = useGameStore((s) => s.flows);
  return (
    <table className="stats-table">
      <thead>
        <tr>
          <th />
          <th>Resource</th>
          <th>Stock</th>
          <th>Income /s</th>
          <th>Use /s</th>
          <th>Net /s</th>
        </tr>
      </thead>
      <tbody>
        {flows.map((f) => (
          <tr key={f.id}>
            <td className="rs-glyph">{f.glyph}</td>
            <td>{f.name}</td>
            <td className="rs-num">{f.stock}</td>
            <td className="rs-num pos">{f.producedPerSec > 0.005 ? `+${fmt(f.producedPerSec)}` : "—"}</td>
            <td className="rs-num neg">{f.consumedPerSec > 0.005 ? `-${fmt(f.consumedPerSec)}` : "—"}</td>
            <td className={`rs-num ${netClass(f.netPerSec)}`}>
              {Math.abs(f.netPerSec) < 0.005
                ? "—"
                : `${f.netPerSec > 0 ? "+" : ""}${f.netPerSec.toFixed(2)}`}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PopulationTab() {
  const population = useGameStore((s) => s.population);
  const capacity = useGameStore((s) => s.capacity);
  const laborSupply = useGameStore((s) => s.laborSupply);
  const laborDemand = useGameStore((s) => s.laborDemand);
  const regions = useGameStore((s) => s.regions).filter((r) => r.claimed);
  const total = regions.reduce((n, r) => n + r.population, 0);

  return (
    <div className="stats-pop">
      <div className="sp-row">
        <span>Population (this city)</span>
        <b>
          👥 {population} / {capacity}
        </b>
      </div>
      <div className="sp-row">
        <span>Workers</span>
        <b className={laborDemand > laborSupply ? "warn" : ""}>
          {laborSupply} / {Math.round(laborDemand)} needed
        </b>
      </div>
      <div className="sp-row">
        <span>Housing headroom</span>
        <b>{Math.max(0, capacity - population)} spaces</b>
      </div>
      <h4>Your cities ({total} villagers)</h4>
      {regions.map((r) => (
        <div className="sp-row" key={r.id}>
          <span>
            {r.name} <small>· {r.biome}</small>
          </span>
          <b>👥 {r.population}</b>
        </div>
      ))}
    </div>
  );
}

const RATE_OPTIONS = [1, 2, 5, 10];

function RoutesTab() {
  const regions = useGameStore((s) => s.regions);
  const routes = useGameStore((s) => s.routes);
  const addRoute = useGameStore((s) => s.addRoute);
  const removeRoute = useGameStore((s) => s.removeRoute);
  const claimed = regions.filter((r) => r.claimed);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [res, setRes] = useState<ResourceId>("wood");
  const [rate, setRate] = useState(2);

  const f = from || claimed[0]?.id || "";
  const t = to || claimed.find((r) => r.id !== f)?.id || "";

  if (claimed.length < 2) {
    return <p className="sp-desc">Claim a second city (on the 🗺 World map) to run trade routes.</p>;
  }

  return (
    <div className="stats-routes">
      {routes.length === 0 && <p className="sp-desc">No routes yet — set one up below.</p>}
      {routes.map((rt) => (
        <div className="nd-row" key={rt.id}>
          <span>
            {rt.fromName} → {rt.toName}: {RESOURCES[rt.resource].glyph}{" "}
            {Math.round(rt.rate * TICK_RATE * 10) / 10}/s
          </span>
          <button className="nd-cancel" onClick={() => removeRoute(rt.id)}>
            ✕
          </button>
        </div>
      ))}
      <div className="route-add">
        <select value={f} onChange={(e) => setFrom(e.target.value)}>
          {claimed.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <span>→</span>
        <select value={t} onChange={(e) => setTo(e.target.value)}>
          {claimed.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <select value={res} onChange={(e) => setRes(e.target.value as ResourceId)}>
          {RESOURCE_ORDER.map((id) => (
            <option key={id} value={id}>
              {RESOURCES[id].name}
            </option>
          ))}
        </select>
        <select value={rate} onChange={(e) => setRate(Number(e.target.value))}>
          {RATE_OPTIONS.map((o) => (
            <option key={o} value={o}>
              {o}/s
            </option>
          ))}
        </select>
        <button className="route-add-btn" onClick={() => f && t && f !== t && addRoute(f, t, res, rate / TICK_RATE)}>
          Add
        </button>
      </div>
    </div>
  );
}

function TradeTab() {
  const regions = useGameStore((s) => s.regions);
  const contracts = useGameStore((s) => s.contracts);
  const cancelDeal = useGameStore((s) => s.cancelDeal);
  const npcs = regions.filter((r) => r.kind === "npc" && r.discovered);

  return (
    <div className="stats-trade">
      <h4>NPC Settlements</h4>
      {npcs.map((n) => (
        <div className="sp-row" key={n.id}>
          <span>
            {n.name} <small>· {n.biome}</small>
          </span>
          <b>★ {n.npc?.reputation ?? 0}</b>
        </div>
      ))}
      <h4>Standing Deals</h4>
      {contracts.length === 0 && (
        <p className="sp-desc">No deals yet — set up Auto-buy / Auto-sell on the 🗺 World map.</p>
      )}
      {contracts.map((c) => (
        <div className="nd-row" key={c.id}>
          <span>
            {c.dir === "sell" ? "Export" : "Import"} {c.qty} {RESOURCES[c.resource].glyph} every{" "}
            {Math.round(c.everyTicks / TICK_RATE)}s
          </span>
          <button className="nd-cancel" onClick={() => cancelDeal(c.id)}>
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
