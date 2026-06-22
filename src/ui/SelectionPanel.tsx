import { useGameStore } from "./store";
import { resourceMapString } from "./format";
import { RESOURCES } from "../engine/economy/resources";
import { TradePanel } from "./TradePanel";
import { UpgradePanel } from "./UpgradePanel";

export function SelectionPanel() {
  const selected = useGameStore((s) => s.selected);
  const laborSupply = useGameStore((s) => s.laborSupply);
  const laborDemand = useGameStore((s) => s.laborDemand);
  const infoHidden = useGameStore((s) => s.infoHidden);
  const toggleInfo = useGameStore((s) => s.toggleInfo);
  const deleteSelected = useGameStore((s) => s.deleteSelected);
  const clearSelection = useGameStore((s) => s.clearSelection);

  if (!selected) return null;

  if (infoHidden) {
    return (
      <div className="selection-panel collapsed panel">
        <button className="sp-reopen" onClick={toggleInfo} title="Show building info">
          ℹ️ {selected.name} ▸
        </button>
      </div>
    );
  }

  const { recipe } = selected;
  const pct = Math.round(selected.productivity * 100);
  const understaffed = laborDemand > laborSupply;

  return (
    <div className="selection-panel panel">
      <div className="sp-head">
        <h3>{selected.name}</h3>
        <div className="sp-head-btns">
          <button className="sp-close" onClick={toggleInfo} title="Hide">
            ▾
          </button>
          <button className="sp-close" onClick={clearSelection} aria-label="Close">
            ✕
          </button>
        </div>
      </div>
      <p className="sp-desc">{selected.description}</p>

      {!selected.built && (
        <div className="sp-recipe">
          <div className="sp-status bad">🔨 Under construction…</div>
          <div className="progress">
            <div
              className="progress-fill"
              style={{ width: `${Math.round(selected.buildProgress * 100)}%` }}
            />
          </div>
        </div>
      )}

      {selected.upgrading != null && (
        <div className="sp-recipe">
          <div className="sp-status">⚙️ Installing upgrade…</div>
          <div className="progress">
            <div
              className="progress-fill"
              style={{ width: `${Math.round(selected.upgrading * 100)}%` }}
            />
          </div>
        </div>
      )}

      {selected.isResidence && (
        <div className="sp-recipe">
          <div className="sp-row">
            <span>Tier</span>
            <b>{selected.tierName}</b>
          </div>
          <div className="sp-row">
            <span>Residents</span>
            <b>
              👥 {selected.residents}/{selected.capacity}
            </b>
          </div>
          {selected.needsKeys && selected.needsKeys.length > 0 && (
            <div className="sp-row">
              <span>Needs</span>
              <b>{selected.needsKeys.map((k) => `${RESOURCES[k].glyph} ${RESOURCES[k].name}`).join(", ")}</b>
            </div>
          )}
          {selected.nextTierName && (
            <div className="sp-grow">
              <span className="sp-grow-head">To grow into {selected.nextTierName}:</span>
              {selected.nextServices && selected.nextServices.length > 0 ? (
                <div className="sp-services">
                  {selected.nextServices.map((s) => (
                    <span key={s.label} className={`svc${s.met ? " ok" : " miss"}`}>
                      {s.met ? "✓" : "✗"} {s.label}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="sp-grow-note">keep them fed &amp; supplied</span>
              )}
            </div>
          )}
        </div>
      )}

      {recipe ? (
        <div className="sp-recipe">
          {Object.keys(recipe.inputs).length > 0 && (
            <div className="sp-row">
              <span>Consumes</span>
              <b>{resourceMapString(recipe.inputs)}</b>
            </div>
          )}
          <div className="sp-row">
            <span>Produces</span>
            <b>{resourceMapString(recipe.outputs)}</b>
          </div>
          {selected.workers != null && (
            <div className="sp-row">
              <span>Workers</span>
              <b className={understaffed ? "warn" : ""}>
                {selected.workers} · town {laborSupply}/{Math.round(laborDemand)}
              </b>
            </div>
          )}
          {recipe.requiresAdjacent && (
            <div className="sp-row">
              <span>Requires</span>
              <b>
                {recipe.requiresAdjacent.min} {recipe.requiresAdjacent.terrain} nearby
              </b>
            </div>
          )}
          <div className="progress">
            <div
              className={`progress-fill${pct > 0 ? "" : " idle"}`}
              style={{ width: `${Math.round(selected.progress * 100)}%` }}
            />
          </div>
          <div className={`sp-status ${pct > 0 ? "ok" : "bad"}`}>
            {pct > 0 ? `Working at ${pct}%` : "Idle — needs forest/rock or workers"}
          </div>
        </div>
      ) : selected.isMarket ? (
        <TradePanel />
      ) : null}

      <UpgradePanel />

      {selected.removable && (
        <button className="danger" onClick={deleteSelected}>
          Demolish
        </button>
      )}
    </div>
  );
}
