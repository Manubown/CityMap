/**
 * Deterministic BFS next-step pathfinding for villagers (M6). Returns the single
 * next tile to walk from `from` toward `to`, avoiding water. BFS with a fixed
 * neighbour order (up, left, right, down) so two loads of the same save produce
 * identical movement. Bounded by EXPLORE_CAP so it can never stall the sim.
 */

import type { GameMap, GridPos } from "../types";
import { tileAt } from "../map/generate";

const DIRS = [
  [0, -1],
  [-1, 0],
  [1, 0],
  [0, 1],
];
const EXPLORE_CAP = 1600;

function walkable(map: GameMap, col: number, row: number): boolean {
  const t = tileAt(map, col, row);
  return !!t && t.terrain !== "water" && !t.buildingId; // route around buildings
}

/** The next tile to step to from `from` toward `to`, or null if arrived/unreachable. */
export function nextStep(map: GameMap, from: GridPos, to: GridPos): GridPos | null {
  if (from.col === to.col && from.row === to.row) return null;
  const W = map.width;
  const key = (c: number, r: number) => r * W + c;

  const prev = new Map<number, GridPos>();
  const seen = new Set<number>([key(from.col, from.row)]);
  const queue: GridPos[] = [from];
  let head = 0;
  let explored = 0;

  while (head < queue.length && explored < EXPLORE_CAP) {
    const cur = queue[head++];
    explored++;
    if (cur.col === to.col && cur.row === to.row) {
      // Walk the predecessor chain back to the tile right after `from`.
      let node = cur;
      while (true) {
        const p = prev.get(key(node.col, node.row));
        if (!p) return node;
        if (p.col === from.col && p.row === from.row) return node;
        node = p;
      }
    }
    for (const [dc, dr] of DIRS) {
      const nc = cur.col + dc;
      const nr = cur.row + dr;
      if (nc < 0 || nr < 0 || nc >= W || nr >= map.height) continue;
      const k = key(nc, nr);
      if (seen.has(k) || !walkable(map, nc, nr)) continue;
      seen.add(k);
      prev.set(k, cur);
      queue.push({ col: nc, row: nr });
    }
  }
  return null;
}
