/**
 * Entity (building) rendering. Each building is a nano-banana sprite scaled so
 * its base plate matches the footprint width and anchored at its ground axis;
 * depth-sorted by the far footprint corner. Falls back to an extruded Graphics
 * block when a texture is unavailable.
 */

import { Container, Graphics, Sprite, type Texture } from "pixi.js";
import type { BuildingInstance, BuildingTypeId, GameMap, Region } from "../engine/types";
import { getBuildingDef } from "../engine/buildings/registry";
import { tileAt } from "../engine/map/generate";
import { TILE_W, gridToScreen, depthKey } from "../engine/iso";
import { drawBuildingBlock, drawMountainProp, drawTreeProp, tileNoise } from "./shapes";
import { SPRITES } from "./manifest";
import decorSpritesJson from "./decorSprites.json";

const DECOR = decorSpritesJson as { trees: string[]; rocks: string[] };

/** Every distinct decoration sprite path (for preloading). */
export const DECOR_SPRITE_PATHS: string[] = [...DECOR.trees, ...DECOR.rocks];

export type DecorTexLookup = (path: string) => Texture | undefined;

const HALF_W = TILE_W / 2;

export type BuildingTexLookup = (type: BuildingTypeId) => Texture | undefined;

export class EntityLayer {
  readonly container = new Container();
  private nodes = new Map<string, Container>();
  private decor: Container[] = [];

  constructor(private getTex: BuildingTexLookup) {
    this.container.sortableChildren = true;
    this.container.label = "entities";
  }

  /**
   * Build static terrain decorations (trees on forest, rocks on rock) into the
   * same depth-sorted container as buildings, so they occlude correctly.
   * Prefers the imported forest sprites; falls back to vector props if the
   * textures are unavailable. Varied by a positional hash.
   */
  setDecor(map: GameMap, tex: DecorTexLookup): void {
    for (const d of this.decor) d.destroy();
    this.decor = [];

    const sprites = (path: string | undefined): Texture | undefined => (path ? tex(path) : undefined);
    const haveTrees = DECOR.trees.length > 0 && !!sprites(DECOR.trees[0]);
    const haveRocks = DECOR.rocks.length > 0 && !!sprites(DECOR.rocks[0]);

    const place = (node: Container, x: number, y: number, z: number): void => {
      node.position.set(x, y);
      node.zIndex = z;
      this.container.addChild(node);
      this.decor.push(node);
    };

    for (let row = 0; row < map.height; row++) {
      for (let col = 0; col < map.width; col++) {
        const tile = tileAt(map, col, row);
        if (!tile || (tile.terrain !== "forest" && tile.terrain !== "rock")) continue;
        const { x, y } = gridToScreen(col, row);
        const z = depthKey(col, row);

        if (tile.terrain === "forest") {
          const count = 1 + Math.floor(tileNoise(col * 1.1, row * 1.9) * 2);
          for (let i = 0; i < count; i++) {
            const ox = (tileNoise(col * 3 + i * 7, row * 5 + i * 3) - 0.5) * 30;
            const oy = (tileNoise(col * 7 + i * 2, row * 3 + i * 9) - 0.5) * 12;
            const sizeVar = 0.8 + tileNoise(col + i * 5, row + i * 2) * 0.5;
            if (haveTrees) {
              const t = sprites(DECOR.trees[Math.floor(tileNoise(col * 3 + i * 9, row * 5 + i) * DECOR.trees.length) % DECOR.trees.length])!;
              const sp = new Sprite(t);
              sp.anchor.set(0.5, 0.94);
              sp.scale.set((74 * sizeVar) / t.height);
              place(sp, x + ox, y + oy, z);
            } else {
              const g = new Graphics();
              drawTreeProp(g, ox, oy, sizeVar * 0.85, tileNoise(col * 2 + i, row * 4 + i));
              place(g, x, y, z);
            }
          }
        } else {
          const sizeVar = 0.85 + tileNoise(col * 2.2, row * 1.4) * 0.8;
          if (haveRocks) {
            const t = sprites(DECOR.rocks[Math.floor(tileNoise(col * 5, row * 7) * DECOR.rocks.length) % DECOR.rocks.length])!;
            const sp = new Sprite(t);
            sp.anchor.set(0.5, 0.9);
            sp.scale.set((46 * sizeVar) / t.height);
            place(sp, x, y, z);
          } else {
            const g = new Graphics();
            drawMountainProp(g, 0, 0, sizeVar);
            place(g, x, y, z);
          }
        }
      }
    }
  }

  /** Reconcile drawn buildings with a region (add new, refresh, drop removed). */
  sync(region: Region): void {
    for (const id of [...this.nodes.keys()]) {
      if (!region.buildings[id]) this.remove(id);
    }
    for (const b of Object.values(region.buildings)) this.upsert(b);
  }

  upsert(b: BuildingInstance): void {
    this.remove(b.id);
    const def = getBuildingDef(b.type);
    const { w: fw, h: fh } = def.footprint;
    const z = depthKey(b.col + fw - 1, b.row + fh - 1);

    const spriteId = def.spriteAlias ?? b.type;
    const texture = this.getTex(spriteId);
    const meta = SPRITES.buildings[spriteId];
    let node: Container;

    if (texture && meta) {
      const sp = new Sprite(texture);
      sp.anchor.set(meta.anchorX, meta.anchorY);
      // Scale so the sprite's base plate spans the footprint's ground rhombus.
      const targetWidth = (fw + fh) * HALF_W;
      sp.scale.set(targetWidth / meta.baseW);
      const c = gridToScreen(b.col + (fw - 1) / 2, b.row + (fh - 1) / 2);
      sp.position.set(c.x, c.y);
      node = sp;
    } else {
      const g = new Graphics();
      drawBuildingBlock(g, def, b.col, b.row, { color: def.color });
      node = g;
    }

    node.zIndex = z;
    this.nodes.set(b.id, node);
    this.container.addChild(node);
  }

  remove(id: string): void {
    const n = this.nodes.get(id);
    if (n) {
      n.destroy();
      this.nodes.delete(id);
    }
  }

  clear(): void {
    for (const id of [...this.nodes.keys()]) this.remove(id);
  }
}
