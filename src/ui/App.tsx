import { useEffect, useRef } from "react";
import { GameController } from "../game/GameController";
import { Hud } from "./Hud";

export function App() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const controller = new GameController();
    void controller.start(host);
    return () => controller.destroy();
  }, []);

  return (
    <div className="game-root">
      <div className="canvas-host" ref={hostRef} />
      <Hud />
    </div>
  );
}
