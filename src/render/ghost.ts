/**
 * Overlay layer: hover tile highlight, the placement "ghost" (a translucent
 * preview tinted green/red by validity, with a red marker on the door side that
 * must stay clear), and the selection outline. Purely visual — it reads game
 * state to validate placement but never mutates it.
 */

import { Container, Graphics } from "pixi.js";
import type { BuildingTypeId, GridPos, Region } from "../engine/types";
import { getBuildingDef } from "../engine/buildings/registry";
import { canPlace, doorTileFor } from "../engine/world";
import { TILE_W, TILE_H, gridToScreen } from "../engine/iso";
import { drawBuildingBlock, drawFootprintOutline, drawTileOutline } from "./shapes";

const VALID = 0x5fd35f;
const INVALID = 0xe05555;
const DOOR = 0xff6b6b;
const SELECT = 0xffe066;
const HOVER = 0xffffff;

function drawDoorMarker(g: Graphics, col: number, row: number): void {
  const c = gridToScreen(col, row);
  const hw = TILE_W / 2;
  const hh = TILE_H / 2;
  g.poly([c.x, c.y - hh, c.x + hw, c.y, c.x, c.y + hh, c.x - hw, c.y])
    .fill({ color: DOOR, alpha: 0.32 })
    .stroke({ color: DOOR, width: 2 });
}

export class Overlay {
  readonly container = new Container();
  private g = new Graphics();
  private region: Region | null = null;
  private hover: GridPos | null = null;
  private ghostType: BuildingTypeId | null = null;
  private ghostFacing = 0;
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

  setGhost(type: BuildingTypeId | null, facing = 0): void {
    this.ghostType = type;
    this.ghostFacing = facing;
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
      const { col, row } = this.hover;
      const ok = canPlace(region, this.ghostType, col, row, { facing: this.ghostFacing }).ok;
      const color = ok ? VALID : INVALID;
      drawBuildingBlock(g, def, col, row, { color, alpha: 0.55, outline: color });
      drawFootprintOutline(g, def, col, row, color, 0.9);
      const door = doorTileFor(def, col, row, this.ghostFacing);
      drawDoorMarker(g, door.col, door.row);
    } else if (this.hover) {
      drawTileOutline(g, this.hover.col, this.hover.row, HOVER);
    }
  }
}
