/**
 * Paths & roads. Reads the sim's per-tile foot-traffic (Tile.wear) and worn-in
 * roads (Tile.road) and draws them: a faint dirt trail while a track is forming,
 * a solid road once villagers have worn it in. Read-only; redrawn a few times a
 * second (roads change slowly).
 */

import { Container, Graphics } from "pixi.js";
import type { Region } from "../engine/types";
import { TILE_W, TILE_H, gridToScreen } from "../engine/iso";
import { tileAt } from "../engine/map/generate";

const HW = (TILE_W / 2) * 0.74;
const HH = (TILE_H / 2) * 0.74;
const ROAD_WEAR = 90;

export class PathLayer {
  readonly container = new Container();
  private g = new Graphics();
  private frame = 0;

  constructor() {
    this.container.label = "paths";
    this.container.addChild(this.g);
  }

  private diamond(x: number, y: number, color: number, alpha: number): void {
    this.g.poly([x, y - HH, x + HW, y, x, y + HH, x - HW, y]).fill({ color, alpha });
  }

  update(region: Region | null): void {
    if (this.frame++ % 8 !== 0) return; // roads change slowly — redraw ~8 fps
    this.g.clear();
    if (!region) return;
    const map = region.map;
    for (let row = 0; row < map.height; row++) {
      for (let col = 0; col < map.width; col++) {
        const t = tileAt(map, col, row);
        if (!t) continue;
        const c = gridToScreen(col, row);
        if (t.road) {
          this.diamond(c.x, c.y, 0x6e5d44, 0.6);
        } else if (t.wear && t.wear > 30) {
          this.diamond(c.x, c.y, 0x8a7250, Math.min(0.4, (t.wear / ROAD_WEAR) * 0.4));
        }
      }
    }
  }

  clear(): void {
    this.g.clear();
  }
}
