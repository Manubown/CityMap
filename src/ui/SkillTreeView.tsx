import { useRef, useState } from "react";
import { useGameStore } from "./store";

const SP = 150; // pixels per grid unit

export function SkillTreeView() {
  const nodes = useGameStore((s) => s.skillNodes);
  const points = useGameStore((s) => s.skillPoints);
  const unlockSkill = useGameStore((s) => s.unlockSkill);
  const setView = useGameStore((s) => s.setView);
  const [pan, setPan] = useState({ x: 0, y: 0, scale: 1 });
  const drag = useRef<{ x: number; y: number } | null>(null);
  const [sel, setSel] = useState<string | null>(null);

  const pos = (id: string) => {
    const n = nodes.find((x) => x.id === id);
    return { x: (n?.pos.x ?? 0) * SP, y: (n?.pos.y ?? 0) * SP };
  };
  const onDown = (e: React.MouseEvent) => (drag.current = { x: e.clientX - pan.x, y: e.clientY - pan.y });
  const onMove = (e: React.MouseEvent) => {
    if (drag.current) setPan((p) => ({ ...p, x: e.clientX - drag.current!.x, y: e.clientY - drag.current!.y }));
  };
  const onUp = () => (drag.current = null);
  const onWheel = (e: React.WheelEvent) =>
    setPan((p) => ({ ...p, scale: Math.max(0.5, Math.min(2, p.scale * (e.deltaY < 0 ? 1.1 : 0.9))) }));

  const selNode = nodes.find((n) => n.id === sel) ?? null;

  return (
    <div className="skilltree">
      <div className="strat-head panel">
        <button className="strat-back" onClick={() => setView("city")}>
          ← Back to city
        </button>
        <span className="strat-title">Skill Tree</span>
        <span className="skill-sp">🌟 {points} SP</span>
      </div>

      <div className="skill-body">
        <svg
          className="skill-canvas"
          onMouseDown={onDown}
          onMouseMove={onMove}
          onMouseUp={onUp}
          onMouseLeave={onUp}
          onWheel={onWheel}
        >
          <g transform={`translate(${460 + pan.x},${300 + pan.y}) scale(${pan.scale})`}>
            {nodes.flatMap((n) =>
              n.requires.map((rq) => {
                const a = pos(n.id);
                const b = pos(rq);
                return (
                  <line
                    key={n.id + rq}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    className={`skill-edge${n.unlocked ? " on" : ""}`}
                  />
                );
              }),
            )}
            {nodes.map((n) => {
              const p = pos(n.id);
              const state = n.unlocked ? "unlocked" : n.available ? "available" : "locked";
              return (
                <g
                  key={n.id}
                  transform={`translate(${p.x},${p.y})`}
                  className={`skill-node ${state}${n.id === sel ? " selected" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSel(n.id);
                  }}
                >
                  <circle r={26} />
                  <text className="skill-icon" y={5} textAnchor="middle">
                    {n.unlocked ? "★" : n.cost || "◆"}
                  </text>
                  <text className="skill-label" y={44} textAnchor="middle">
                    {n.name}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        <div className="skill-panel panel">
          {!selNode ? (
            <p className="sp-desc">
              Drag to pan, scroll to zoom. Click a node to inspect or unlock it. Skill points come
              from your population.
            </p>
          ) : (
            <div>
              <h3>{selNode.name}</h3>
              <p className="sp-desc">{selNode.description}</p>
              {selNode.effectLabel && (
                <div className="sp-row">
                  <span>Bonus</span>
                  <b>{selNode.effectLabel}</b>
                </div>
              )}
              <div className="sp-row">
                <span>Cost</span>
                <b>🌟 {selNode.cost}</b>
              </div>
              {selNode.unlocked ? (
                <div className="sp-status ok">Unlocked</div>
              ) : selNode.available ? (
                <button
                  className="tech-btn enter"
                  disabled={!selNode.affordable}
                  onClick={() => unlockSkill(selNode.id)}
                >
                  Unlock · 🌟 {selNode.cost}
                </button>
              ) : (
                <div className="sp-status bad">Requires earlier nodes</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
