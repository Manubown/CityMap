import { useGameStore } from "./store";
import { ResourceBar } from "./ResourceBar";
import { BuildBar } from "./BuildBar";
import { SelectionPanel } from "./SelectionPanel";
import { RegionTabs } from "./RegionTabs";
import { RoutesPanel } from "./RoutesPanel";
import { ResearchPanel } from "./ResearchPanel";
import { StrategicView } from "./StrategicView";
import { SkillTreeView } from "./SkillTreeView";
import { InstructionCard } from "./InstructionCard";
import { ClockPanel } from "./ClockPanel";

export function Hud() {
  const running = useGameStore((s) => s.running);
  const tick = useGameStore((s) => s.tick);
  const buildingCount = useGameStore((s) => s.buildingCount);
  const buildMode = useGameStore((s) => s.buildMode);
  const clearMode = useGameStore((s) => s.clearMode);
  const message = useGameStore((s) => s.message);
  const viewMode = useGameStore((s) => s.viewMode);

  const togglePause = useGameStore((s) => s.togglePause);
  const save = useGameStore((s) => s.save);
  const newGame = useGameStore((s) => s.newGame);
  const setView = useGameStore((s) => s.setView);

  if (viewMode === "strategic") return <StrategicView />;
  if (viewMode === "skills") return <SkillTreeView />;

  return (
    <div className="hud">
      <ResourceBar />
      <ClockPanel />
      <RegionTabs />
      <div className="left-stack">
        <ResearchPanel />
        <RoutesPanel />
      </div>

      <div className="controls panel">
        <span className="stat">🏚 {buildingCount}</span>
        <span className="stat">⏱ {tick}</span>
        <button onClick={() => setView("strategic")}>🗺 World</button>
        <button onClick={() => setView("skills")}>🌟 Skills</button>
        <button onClick={togglePause}>{running ? "⏸ Pause" : "▶ Resume"}</button>
        <button onClick={save}>💾 Save</button>
        <button onClick={newGame}>🌱 New</button>
      </div>

      <SelectionPanel />
      <BuildBar />

      <InstructionCard />

      {buildMode && (
        <div className="mode-flag panel">Building — R to rotate the door · Esc to cancel</div>
      )}
      {clearMode && (
        <div className="mode-flag panel">
          🪓 Clear mode — forest 🪙5 / rock 🪙10 · Esc to cancel
        </div>
      )}
      {message && <div className="toast">{message}</div>}
    </div>
  );
}
