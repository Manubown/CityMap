import { useEffect, useState } from "react";
import { useGameStore } from "./store";
import { SpeedControls } from "./SettingsModal";

/** True when the viewport is phone-sized. Reacts to resize/rotation. */
export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 860px)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 860px)");
    const onChange = (e: MediaQueryListEvent) => setMobile(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return mobile;
}

/** Mobile top-right hamburger that opens a drawer with all the nav/pages. */
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const setView = useGameStore((s) => s.setView);
  const save = useGameStore((s) => s.save);
  const toggleMenu = useGameStore((s) => s.toggleMenu);
  const hour = useGameStore((s) => s.timeHour);
  const minute = useGameStore((s) => s.timeMinute);
  const day = useGameStore((s) => s.dayNum);
  const night = useGameStore((s) => s.isNight);
  const seasonEmoji = useGameStore((s) => s.seasonEmoji);
  const seasonName = useGameStore((s) => s.seasonName);

  const go = (fn: () => void) => () => {
    fn();
    setOpen(false);
  };
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");

  return (
    <>
      <button className="hamburger panel" onClick={() => setOpen((o) => !o)} aria-label="Menu">
        ☰
      </button>
      {open && (
        <div className="mobile-drawer-backdrop" onClick={() => setOpen(false)}>
          <div className="mobile-drawer panel" onClick={(e) => e.stopPropagation()}>
            <div className="md-clock">
              {night ? "🌙" : "☀️"} {hh}:{mm} · Day {day} · {seasonEmoji} {seasonName}
            </div>
            <div className="md-speed">
              <span>Speed</span>
              <SpeedControls />
            </div>
            <button onClick={go(() => setView("strategic"))}>🗺 World map</button>
            <button onClick={go(() => setView("stats"))}>📊 Statistics</button>
            <button onClick={go(() => setView("skills"))}>🌟 Skill tree</button>
            <button onClick={go(save)}>💾 Quick save</button>
            <button onClick={go(toggleMenu)}>⚙️ Menu / saves</button>
          </div>
        </div>
      )}
    </>
  );
}
