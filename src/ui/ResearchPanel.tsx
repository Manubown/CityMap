import { useState } from "react";
import { useGameStore } from "./store";

export function ResearchPanel() {
  const techs = useGameStore((s) => s.techs);
  const points = useGameStore((s) => s.researchPoints);
  const ageName = useGameStore((s) => s.ageName);
  const research = useGameStore((s) => s.research);
  const [open, setOpen] = useState(false);

  return (
    <div className="research panel">
      <button className="research-head" onClick={() => setOpen((o) => !o)}>
        🔬 {ageName}
        <span className="research-pts">{points} pts</span>
        <span className="routes-caret">{open ? "▾" : "▸"}</span>
      </button>

      {open && (
        <div className="research-body">
          {techs.map((t) => (
            <div className={`tech-row${t.completed ? " done" : ""}`} key={t.id} title={t.description}>
              <div className="tech-info">
                <span className="tech-name">
                  {t.completed ? "✓ " : ""}
                  {t.name}
                </span>
                <span className="tech-desc">{t.description}</span>
              </div>
              {t.completed ? (
                <span className="tech-tag">done</span>
              ) : t.available ? (
                <button
                  className="tech-btn"
                  disabled={!t.affordable}
                  onClick={() => research(t.id)}
                  title={`Costs ${t.cost} research points`}
                >
                  🔬 {t.cost}
                </button>
              ) : (
                <span className="tech-tag locked">🔒</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
