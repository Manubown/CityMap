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
import { Minimap } from "./Minimap";

export function Hud() {
  const buildingCount = useGameStore((s) => s.buildingCount);
  const buildMode = useGameStore((s) => s.buildMode);
  const clearMode = useGameStore((s) => s.clearMode);
  const message = useGameStore((s) => s.message);
  const viewMode = useGameStore((s) => s.viewMode);

  const save = useGameStore((s) => s.save);
  const toggleMenu = useGameStore((s) => s.toggleMenu);
  const setView = useGameStore((s) => s.setView);
  const rotateBuild = useGameStore((s) => s.rotateBuild);
  const cancelBuild = useGameStore((s) => s.cancelBuild);
  const toggleClear = useGameStore((s) => s.toggleClear);

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

      <Minimap />
      <SelectionPanel />
      <BuildBar />

      <InstructionCard />
      <SettingsModal />

      {buildMode && (
        <>
          <div className="mode-flag panel">Building — rotate the door · tap to place</div>
          <div className="touch-actions">
            <button onClick={rotateBuild} title="Rotate door (R)">
              ↻
            </button>
            <button onClick={cancelBuild} title="Cancel (Esc)">
              ✕
            </button>
          </div>
        </>
      )}
      {clearMode && (
        <>
          <div className="mode-flag panel">🪓 Clear — forest 🪙5 / rock 🪙10 · tap tiles</div>
          <div className="touch-actions">
            <button onClick={toggleClear} title="Done">
              ✓
            </button>
          </div>
        </>
      )}
      {message && <div className="toast">{message}</div>}
    </div>
  );
}
