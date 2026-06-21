/**
 * Terrain rendering. Each tile is a flat 128x64 diamond sprite (CC0 Screaming
 * Brain Studios tiles) chosen from several per-type variants by a positional
 * hash — so the ground reads as a varied field with no visible repetition.
 * Tiles tessellate exactly, so no depth sorting is needed. Terrain types with
 * no sprite (e.g. water) fall back to the vector low-poly tile.
 */

import { Container, Graphics, Sprite, type Texture } from "pixi.js";
import type { GameMap, TerrainType } from "../engine/types";
import { tileAt } from "../engine/map/generate";
import { TILE_W, gridToScreen } from "../engine/iso";
import { drawPolyTile, tileNoise } from "./shapes";
import terrainSpritesJson from "./terrainSprites.json";

const TERRAIN_SPRITES = terrainSpritesJson as Partial<Record<TerrainType, string[]>>;

export type TerrainTexLookup = (path: string) => Texture | undefined;

/** Every distinct terrain sprite path (for preloading). */
export const TERRAIN_SPRITE_PATHS: string[] = Object.values(TERRAIN_SPRITES)
  .flat()
  .filter((p): p is string => typeof p === "string");

function varyTint(n: number): number {
  const v = Math.round(255 * (0.9 + n * 0.1));
  return (v << 16) | (v << 8) | v;
}

export function buildTerrainLayer(map: GameMap, tex: TerrainTexLookup): Container {
  const layer = new Container();
  layer.label = "terrain";

  for (let row = 0; row < map.height; row++) {
    for (let col = 0; col < map.width; col++) {
      const tile = tileAt(map, col, row);
      if (!tile) continue;
      const { x, y } = gridToScreen(col, row);
      const variants = TERRAIN_SPRITES[tile.terrain];

      let texture: Texture | undefined;
      if (variants && variants.length) {
        const idx = Math.floor(tileNoise(col * 1.3 + 2, row * 1.7 + 5) * variants.length);
        texture = tex(variants[Math.min(idx, variants.length - 1)]);
      }

      if (texture) {
        const sp = new Sprite(texture);
        sp.anchor.set(0.5, 0.5);
        // Overlap tiles ~4% so the thin anti-aliased edges cover each other and
        // there are no seams; painter order (N->S) keeps it clean.
        const s = (TILE_W / texture.width) * 1.04;
        const flip = tileNoise(col * 1.7 + 0.3, row * 2.3 + 0.7) > 0.5 ? -1 : 1;
        sp.scale.set(s * flip, s);
        sp.tint = varyTint(tileNoise(col, row));
        sp.position.set(x, y);
        layer.addChild(sp);
      } else {
        const g = new Graphics();
        drawPolyTile(g, col, row, tile.terrain);
        layer.addChild(g);
      }
    }
  }
  return layer;
}
