import { useEffect, useRef } from "react";
import { useGameStore } from "./store";

/** A top-down region overview drawn by the renderer; click/tap to jump there. */
export function Minimap() {
  const registerMinimap = useGameStore((s) => s.registerMinimap);
  const minimapJump = useGameStore((s) => s.minimapJump);
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    registerMinimap(ref.current);
    return () => registerMinimap(null);
  }, [registerMinimap]);

  const jump = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const c = ref.current;
    if (!c) return;
    const r = c.getBoundingClientRect();
    minimapJump((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
  };

  return (
    <div className="minimap panel">
      <canvas ref={ref} width={150} height={150} onClick={jump} />
    </div>
  );
}
