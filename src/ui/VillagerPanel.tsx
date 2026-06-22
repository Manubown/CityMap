import { useGameStore } from "./store";

/** Shown when you click a villager — their name, job, home, activity and mood. */
export function VillagerPanel() {
  const agent = useGameStore((s) => s.selectedAgent);
  const clearSelection = useGameStore((s) => s.clearSelection);
  if (!agent) return null;

  return (
    <div className="villager-panel panel">
      <div className="sp-head">
        <h3>🧑 {agent.name}</h3>
        <button className="sp-close" onClick={clearSelection} aria-label="Close">
          ✕
        </button>
      </div>
      <div className="sp-row">
        <span>Job</span>
        <b>{agent.job}</b>
      </div>
      <div className="sp-row">
        <span>Home</span>
        <b>{agent.home}</b>
      </div>
      <div className="sp-row">
        <span>Now</span>
        <b>{agent.activity}</b>
      </div>
      <div className="sp-row">
        <span>Mood</span>
        <b>{agent.mood}</b>
      </div>
    </div>
  );
}
