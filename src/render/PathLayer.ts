/**
 * Worn footpaths. A render-only trail system: tiles villagers stand on gain
 * "wear" each frame and slowly fade; tiles walked often enough show a trampled
 * dirt patch. Purely cosmetic — it never touches the sim or saves, so it can use
 * wall-clock accumulation freely.
 */

import { Container, Graphics } from "pixi.js";
import type { Region } from "../engine/types";
import { TILE_W, TILE_H, gridToScreen } from "../engine/iso";

const GAIN = 0.05; // wear added per frame an agent stands on a tile
const DECAY = 0.012; // wear lost per frame
const SHOW = 0.5; // wear at which a path becomes visible
const HW = (TILE_W / 2) * 0.6;
const HH = (TILE_H / 2) * 0.6;

export class PathLayer {
  readonly container = new Container();
  private g = new Graphics();
  private wear = new Map<number, number>();

  constructor() {
    this.container.label = "paths";
    this.container.addChild(this.g);
  }

  update(region: Region | null): void {
    this.g.clear();
    if (!region) return;
    const W = region.map.width;

    for (const a of region.agents) {
      const k = a.row * W + a.col;
      this.wear.set(k, Math.min(3, (this.wear.get(k) ?? 0) + GAIN));
    }

    for (const [k, v] of this.wear) {
      const nv = v - DECAY;
      if (nv <= 0.05) {
        this.wear.delete(k);
        continue;
      }
      this.wear.set(k, nv);
      if (nv < SHOW) continue;
      const col = k % W;
      const row = Math.floor(k / W);
      const c = gridToScreen(col, row);
      const alpha = Math.min(0.5, (nv - SHOW) * 0.45);
      this.g.poly([c.x, c.y - HH, c.x + HW, c.y, c.x, c.y + HH, c.x - HW, c.y]).fill({
        color: 0x8a7250,
        alpha,
      });
    }
  }

  clear(): void {
    this.wear.clear();
    this.g.clear();
  }
}
