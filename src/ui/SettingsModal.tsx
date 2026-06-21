import { useEffect, useState } from "react";
import { useGameStore } from "./store";
import { slotInfo, type SaveSlot, type SlotInfo } from "../engine/save/persistence";
import { dayNumber } from "../engine/time";

const SLOTS: SaveSlot[] = ["auto", "1", "2", "3"];

export function SpeedControls() {
  const running = useGameStore((s) => s.running);
  const speed = useGameStore((s) => s.gameSpeed);
  const togglePause = useGameStore((s) => s.togglePause);
  const setSpeed = useGameStore((s) => s.setSpeed);

  return (
    <div className="speed-ctrl">
      <button className={running ? "" : "active"} onClick={togglePause} title="Pause / resume">
        {running ? "⏸" : "▶"}
      </button>
      {[1, 2, 3].map((n) => (
        <button
          key={n}
          className={running && speed === n ? "active" : ""}
          onClick={() => setSpeed(n)}
        >
          {n}×
        </button>
      ))}
    </div>
  );
}

export function SettingsModal() {
  const menuOpen = useGameStore((s) => s.menuOpen);
  const toggleMenu = useGameStore((s) => s.toggleMenu);
  const saveSlot = useGameStore((s) => s.saveSlot);
  const loadSlot = useGameStore((s) => s.loadSlot);
  const newGame = useGameStore((s) => s.newGame);
  const [infos, setInfos] = useState<Record<string, SlotInfo | null>>({});

  const refresh = async () => {
    const r: Record<string, SlotInfo | null> = {};
    for (const s of SLOTS) r[s] = await slotInfo(s);
    setInfos(r);
  };

  useEffect(() => {
    if (menuOpen) void refresh();
  }, [menuOpen]);

  if (!menuOpen) return null;

  return (
    <div className="intro-backdrop" onClick={toggleMenu}>
      <div className="menu-card panel" onClick={(e) => e.stopPropagation()}>
        <div className="menu-head">
          <h2>⚙️ Menu</h2>
          <button className="sp-close" onClick={toggleMenu} aria-label="Close">
            ✕
          </button>
        </div>

        <h4>Saves</h4>
        {SLOTS.map((slot) => {
          const info = infos[slot];
          return (
            <div className="save-row" key={slot}>
              <span>
                {slot === "auto" ? "Autosave" : `Slot ${slot}`}{" "}
                <small>{info ? `Day ${dayNumber(info.tick)}` : "empty"}</small>
              </span>
              <div className="save-btns">
                {slot !== "auto" && (
                  <button
                    onClick={() => {
                      saveSlot(slot);
                      setTimeout(() => void refresh(), 250);
                    }}
                  >
                    Save
                  </button>
                )}
                <button disabled={!info?.compatible} onClick={() => loadSlot(slot)}>
                  Load
                </button>
              </div>
            </div>
          );
        })}

        <h4>Game</h4>
        <button
          className="danger"
          onClick={() => {
            newGame();
            toggleMenu();
          }}
        >
          🌱 New World
        </button>
      </div>
    </div>
  );
}
