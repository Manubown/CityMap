/**
 * Building status FX. An immediate-mode overlay that, each frame, signals what a
 * building is doing: a construction / upgrade progress bar, a soft pulsing glow
 * while it produces, and a bobbing arrow when an upgrade is available. Cheap
 * (a handful of buildings, one Graphics redrawn per frame); animated off
 * wall-clock time, so it never affects the deterministic sim.
 */

import { Container, Graphics } from "pixi.js";
import type { Region } from "../engine/types";
import { getBuildingDef } from "../engine/buildings/registry";
import { availableUpgrades } from "../engine/buildings/upgrades";
import { gridToScreen } from "../engine/iso";

function bar(g: Graphics, x: number, y: number, frac: number, color: number): void {
  const W = 30;
  const H = 5;
  g.roundRect(x - W / 2, y, W, H, 2).fill({ color: 0x12181f, alpha: 0.85 });
  g.roundRect(x - W / 2, y, W * Math.max(0, Math.min(1, frac)), H, 2).fill({ color });
}

function upArrow(g: Graphics, x: number, y: number, color: number): void {
  g.poly([x, y - 7, x - 6, y + 3, x + 6, y + 3])
    .fill({ color })
    .stroke({ color: 0x12181f, width: 1 });
}

export class StatusLayer {
  readonly container = new Container();
  private g = new Graphics();

  constructor() {
    this.container.label = "status";
    this.container.addChild(this.g);
  }

  update(region: Region | null, phaseMs: number): void {
    const g = this.g;
    g.clear();
    if (!region) return;

    const pulse = 0.5 + 0.5 * Math.sin(phaseMs / 350); // 0..1
    const bob = Math.sin(phaseMs / 300) * 3;

    for (const b of Object.values(region.buildings)) {
      const { w: fw, h: fh } = getBuildingDef(b.type).footprint;
      const c = gridToScreen(b.col + (fw - 1) / 2, b.row + (fh - 1) / 2);
      const topY = c.y - 40 - (fw + fh) * 6;

      if (!b.built) {
        bar(g, c.x, topY, b.buildProgress, 0xe9c46a);
        continue;
      }
      if (b.pendingUpgrade) {
        bar(g, c.x, topY, b.pendingUpgrade.progress, 0x6fa8dc);
      } else if (b.productivity > 0) {
        g.circle(c.x, c.y, 9 + pulse * 5).fill({ color: 0x5fd3a3, alpha: 0.12 + pulse * 0.14 });
      }
      if (!b.pendingUpgrade && availableUpgrades(b).length > 0) {
        upArrow(g, c.x, topY + bob, 0xffd966);
      }
    }
  }
}
