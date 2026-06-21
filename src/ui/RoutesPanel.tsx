import { useState } from "react";
import { useGameStore } from "./store";
import { RESOURCE_ORDER, RESOURCES } from "../engine/economy/resources";
import { TICK_RATE } from "../engine/tick";
import type { ResourceId } from "../engine/types";

const RATE_OPTIONS = [1, 2, 5, 10]; // units per second

export function RoutesPanel() {
  const regions = useGameStore((s) => s.regions);
  const routes = useGameStore((s) => s.routes);
  const addRoute = useGameStore((s) => s.addRoute);
  const removeRoute = useGameStore((s) => s.removeRoute);
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [res, setRes] = useState<ResourceId>("wood");
  const [rate, setRate] = useState(2); // per second

  const claimed = regions.filter((r) => r.claimed);
  // Only useful once you have 2+ regions to move goods between.
  if (claimed.length < 2 && routes.length === 0) return null;

  const f = from || claimed[0]?.id || "";
  const t = to || claimed.find((r) => r.id !== f)?.id || "";

  return (
    <div className="routes panel">
      <button className="routes-head" onClick={() => setOpen((o) => !o)}>
        🚚 Trade Routes <span className="routes-count">{routes.length}</span>
        <span className="routes-caret">{open ? "▾" : "▸"}</span>
      </button>

      {open && (
        <div className="routes-body">
          {routes.length === 0 && <div className="routes-empty">No routes yet.</div>}
          {routes.map((rt) => (
            <div className="route-row" key={rt.id}>
              <span className="route-text">
                {rt.fromName} → {rt.toName}: {RESOURCES[rt.resource].glyph}{" "}
                {Math.round(rt.rate * TICK_RATE * 10) / 10}/s
              </span>
              <button className="route-del" onClick={() => removeRoute(rt.id)} title="Remove">
                ✕
              </button>
            </div>
          ))}

          {claimed.length >= 2 && (
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
              <select value={rate} onChange={(e) => setRate(Number(e.target.value))} title="Amount per second">
                {RATE_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}/s
                  </option>
                ))}
              </select>
              <button
                className="route-add-btn"
                onClick={() => f && t && f !== t && addRoute(f, t, res, rate / TICK_RATE)}
              >
                Add
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
