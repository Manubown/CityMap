import { useState } from "react";
import { useGameStore } from "./store";

export function QuestPanel() {
  const quests = useGameStore((s) => s.quests);
  const done = useGameStore((s) => s.questsDone);
  const [open, setOpen] = useState(true);

  if (quests.length === 0 && done === 0) return null;

  return (
    <div className="quests panel">
      <button className="quests-head" onClick={() => setOpen((o) => !o)}>
        🎯 Quests
        <span className="quests-count">{done} done</span>
        <span className="routes-caret">{open ? "▾" : "▸"}</span>
      </button>

      {open && (
        <div className="quests-body">
          {quests.length === 0 ? (
            <div className="routes-empty">All quests done — 🎉</div>
          ) : (
            quests.map((q) => (
              <div className="quest-row" key={q.id}>
                <span className="quest-title">{q.title}</span>
                <span className="quest-goal">{q.goal}</span>
                <span className="quest-reward">🎁 {q.reward}</span>
                {q.progress > 0 && (
                  <div className="progress quest-prog">
                    <div
                      className="progress-fill"
                      style={{ width: `${Math.round(q.progress * 100)}%` }}
                    />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
