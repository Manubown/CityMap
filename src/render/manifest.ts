/**
 * Typed access to the sprite manifest emitted by scripts/process-assets.py.
 * Each sprite records its trimmed size, the normalized anchor (the isometric
 * ground point we pin to the tile grid), and the base width in px used to
 * scale the sprite so its footprint matches the grid.
 */
import data from "./spriteManifest.json";

export interface SpriteMeta {
  w: number;
  h: number;
  anchorX: number;
  anchorY: number;
  baseW: number;
}

export interface SpriteManifest {
  buildings: Record<string, SpriteMeta>;
  icons: Record<string, { w: number; h: number }>;
}

export const SPRITES = data as SpriteManifest;
