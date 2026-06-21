import { useState } from "react";

const KEY = "citymap_onboarded";

/** A one-time welcome / controls card shown on first launch, then dismissed for good. */
export function InstructionCard() {
  const [show, setShow] = useState(() => {
    try {
      return !localStorage.getItem(KEY);
    } catch {
      return true;
    }
  });
  if (!show) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
    setShow(false);
  };

  return (
    <div className="intro-backdrop" onClick={dismiss}>
      <div className="intro-card panel" onClick={(e) => e.stopPropagation()}>
        <h2>Welcome to CityMap 🏙️</h2>
        <p className="intro-lead">
          Grow your Stone-Age village into a thriving city, then expand across the world.
        </p>
        <ul className="intro-list">
          <li>
            <b>Move</b> — drag or WASD to pan, mouse wheel to zoom.
          </li>
          <li>
            <b>Build</b> — pick a building from the bar below and click a tile. Right-click or Esc
            cancels. Hover a building to see where it goes.
          </li>
          <li>
            <b>Grow</b> — keep villagers fed; collect taxes; spend research on the tech ladder
            toward the Bronze Age.
          </li>
          <li>
            <b>Expand</b> — open the 🗺 World map to buy new cities in other biomes, trade with
            neighbours, and run routes between your colonies.
          </li>
          <li>
            <b>Improve</b> — select a building to upgrade it; spend 🌟 skill points in the tree.
          </li>
        </ul>
        <button className="intro-go" onClick={dismiss}>
          Start building →
        </button>
      </div>
    </div>
  );
}
