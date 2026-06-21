import { useGameStore } from "./store";
import { ResourceBar } from "./ResourceBar";
import { BuildBar } from "./BuildBar";
import { SelectionPanel } from "./SelectionPanel";
import { RegionTabs } from "./RegionTabs";
import { RoutesPanel } from "./RoutesPanel";
import { ResearchPanel } from "./ResearchPanel";

export function Hud() {
  const running = useGameStore((s) => s.running);
  const tick = useGameStore((s) => s.tick);
  const buildingCount = useGameStore((s) => s.buildingCount);
  const buildMode = useGameStore((s) => s.buildMode);
  const message = useGameStore((s) => s.message);

  const togglePause = useGameStore((s) => s.togglePause);
  const save = useGameStore((s) => s.save);
  const newGame = useGameStore((s) => s.newGame);

  return (
    <div className="hud">
      <ResourceBar />
      <RegionTabs />
      <div className="left-stack">
        <ResearchPanel />
        <RoutesPanel />
      </div>

      <div className="controls panel">
        <span className="stat">🏚 {buildingCount}</span>
        <span className="stat">⏱ {tick}</span>
        <button onClick={togglePause}>{running ? "⏸ Pause" : "▶ Resume"}</button>
        <button onClick={save}>💾 Save</button>
        <button onClick={newGame}>🌱 New</button>
      </div>

      <SelectionPanel />
      <BuildBar />

      <div className="hint panel">
        Drag / WASD to pan · wheel to zoom · pick a building below, click to place ·
        right-click to cancel
      </div>

      {buildMode && <div className="mode-flag panel">Building mode — Esc to cancel</div>}
      {message && <div className="toast">{message}</div>}
    </div>
  );
}
