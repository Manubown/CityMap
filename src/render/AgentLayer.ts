/**
 * Villager rendering (M6). A DEDICATED layer of pooled dots, depth-sorted only
 * among themselves (the buildings/decor layer is never re-sorted per frame).
 * Positions are interpolated between the agent's current and next tile using the
 * sim clock fraction, so motion is smooth at any framerate. Cosmetic only.
 */

import { Container, Graphics } from "pixi.js";
import type { Region } from "../engine/types";
import { gridToScreen } from "../engine/iso";
import { MOVE_STEP } from "../engine/systems/agents";
import { roleColor } from "../engine/agents/roles";

const RADIUS = 4.5;
const LIFT = 8; // px above the tile centre so dots sit on the ground

export class AgentLayer {
  readonly container = new Container();
  private pool: { g: Graphics; color: number }[] = [];

  constructor() {
    this.container.sortableChildren = true;
    this.container.label = "agents";
  }

  private redraw(g: Graphics, color: number): void {
    g.clear();
    g.circle(0, -LIFT, RADIUS).fill({ color }).stroke({ color: 0x10161d, width: 1.5 });
  }

  update(region: Region | null, fraction: number): void {
    const agents = region ? region.agents : [];

    while (this.pool.length < agents.length) {
      const g = new Graphics();
      this.redraw(g, 0xffffff);
      this.container.addChild(g);
      this.pool.push({ g, color: 0xffffff });
    }

    for (let i = 0; i < this.pool.length; i++) {
      const slot = this.pool[i];
      if (i >= agents.length) {
        slot.g.visible = false;
        continue;
      }
      const a = agents[i];
      slot.g.visible = true;

      const color = roleColor(a.role);
      if (slot.color !== color) {
        this.redraw(slot.g, color);
        slot.color = color;
      }

      const vp = Math.min(1, a.progress + fraction * MOVE_STEP);
      const p0 = gridToScreen(a.col, a.row);
      const p1 = gridToScreen(a.ncol, a.nrow);
      slot.g.position.set(p0.x + (p1.x - p0.x) * vp, p0.y + (p1.y - p0.y) * vp);
      slot.g.zIndex = a.col + a.row;
    }
  }

  clear(): void {
    for (const slot of this.pool) slot.g.destroy();
    this.pool = [];
    this.container.removeChildren();
  }
}
