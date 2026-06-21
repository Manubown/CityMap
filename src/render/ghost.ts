/**
 * Overlay layer: hover tile highlight, the placement "ghost" (a translucent
 * preview tinted green/red by validity), and the selection outline. Purely
 * visual — it reads game state to validate placement but never mutates it.
 */

import { Container, Graphics } from "pixi.js";
import type { BuildingTypeId, GridPos, Region } from "../engine/types";
import { getBuildingDef } from "../engine/buildings/registry";
import { canPlace } from "../engine/world";
import { drawBuildingBlock, drawFootprintOutline, drawTileOutline } from "./shapes";

const VALID = 0x5fd35f;
const INVALID = 0xe05555;
const SELECT = 0xffe066;
const HOVER = 0xffffff;

export class Overlay {
  readonly container = new Container();
  private g = new Graphics();
  private region: Region | null = null;
  private hover: GridPos | null = null;
  private ghostType: BuildingTypeId | null = null;
  private selectionId: string | null = null;

  constructor() {
    this.container.addChild(this.g);
    this.container.label = "overlay";
    this.container.eventMode = "none";
  }

  attach(region: Region): void {
    this.region = region;
    this.redraw();
  }

  setHover(tile: GridPos | null): void {
    this.hover = tile;
    this.redraw();
  }

  setGhost(type: BuildingTypeId | null): void {
    this.ghostType = type;
    this.redraw();
  }

  setSelection(id: string | null): void {
    this.selectionId = id;
    this.redraw();
  }

  redraw(): void {
    const g = this.g;
    g.clear();
    const region = this.region;
    if (!region) return;

    if (this.selectionId) {
      const b = region.buildings[this.selectionId];
      if (b) drawFootprintOutline(g, getBuildingDef(b.type), b.col, b.row, SELECT, 1);
    }

    if (this.ghostType && this.hover) {
      const def = getBuildingDef(this.ghostType);
      const ok = canPlace(region, this.ghostType, this.hover.col, this.hover.row).ok;
      const color = ok ? VALID : INVALID;
      drawBuildingBlock(g, def, this.hover.col, this.hover.row, {
        color,
        alpha: 0.55,
        outline: color,
      });
      drawFootprintOutline(g, def, this.hover.col, this.hover.row, color, 0.9);
    } else if (this.hover) {
      drawTileOutline(g, this.hover.col, this.hover.row, HOVER);
    }
  }
}
