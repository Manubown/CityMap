import { useGameStore } from "./store";
import { ResourceBar } from "./ResourceBar";
import { BuildBar } from "./BuildBar";
import { SelectionPanel } from "./SelectionPanel";
import { RegionTabs } from "./RegionTabs";
import { RoutesPanel } from "./RoutesPanel";
import { ResearchPanel } from "./ResearchPanel";
import { StrategicView } from "./StrategicView";
import { SkillTreeView } from "./SkillTreeView";
import { StatsView } from "./StatsView";
import { InstructionCard } from "./InstructionCard";
import { ClockPanel } from "./ClockPanel";
import { SettingsModal, SpeedControls } from "./SettingsModal";

export function Hud() {
  const buildingCount = useGameStore((s) => s.buildingCount);
  const buildMode = useGameStore((s) => s.buildMode);
  const clearMode = useGameStore((s) => s.clearMode);
  const message = useGameStore((s) => s.message);
  const viewMode = useGameStore((s) => s.viewMode);

  const save = useGameStore((s) => s.save);
  const toggleMenu = useGameStore((s) => s.toggleMenu);
  const setView = useGameStore((s) => s.setView);

  if (viewMode === "strategic") return <StrategicView />;
  if (viewMode === "skills") return <SkillTreeView />;
  if (viewMode === "stats") return <StatsView />;

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
        <button onClick={() => setView("strategic")}>🗺 World</button>
        <button onClick={() => setView("stats")}>📊 Stats</button>
        <button onClick={() => setView("skills")}>🌟 Skills</button>
        <SpeedControls />
        <button onClick={save} title="Quick save">
          💾
        </button>
        <button onClick={toggleMenu} title="Menu">
          ⚙️
        </button>
      </div>

      <SelectionPanel />
      <BuildBar />

      <InstructionCard />
      <SettingsModal />

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
