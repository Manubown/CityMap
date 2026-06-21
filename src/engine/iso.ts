/**
 * Isometric (2:1 dimetric) coordinate math.
 *
 * Tiles are diamonds TILE_W x TILE_H. The grid->screen transform maps a
 * (col, row) tile to the screen position of the *centre* of its diamond.
 * Screen space here is "world space" inside the Pixi world container; the
 * camera container applies pan/zoom on top.
 */

import type { GridPos } from "./types";

export const TILE_W = 128;
export const TILE_H = 64;

const HALF_W = TILE_W / 2;
const HALF_H = TILE_H / 2;

/** Tile (col,row) -> screen centre of its diamond. */
export function gridToScreen(col: number, row: number): { x: number; y: number } {
  return {
    x: (col - row) * HALF_W,
    y: (col + row) * HALF_H,
  };
}

/** Screen point -> fractional grid coordinate (inverse of gridToScreen). */
export function screenToGrid(x: number, y: number): { col: number; row: number } {
  const a = x / HALF_W;
  const b = y / HALF_H;
  return {
    col: (a + b) / 2,
    row: (b - a) / 2,
  };
}

/**
 * Screen point -> the integer tile it falls inside.
 *
 * gridToScreen maps a tile to the *centre* of its diamond, so in continuous
 * grid space a tile covers [col-0.5, col+0.5) x [row-0.5, row+0.5) — i.e. we
 * round to the nearest integer, not floor.
 */
export function screenToTile(x: number, y: number): GridPos {
  const g = screenToGrid(x, y);
  return { col: Math.round(g.col), row: Math.round(g.row) };
}

/** Depth-sort key: tiles/buildings with a larger (col+row) are nearer the camera. */
export function depthKey(col: number, row: number): number {
  return col + row;
}

/** The four corner points of a tile diamond (centre at the tile), clockwise from top. */
export function diamondPoints(centerX: number, centerY: number): number[] {
  return [
    centerX, centerY - HALF_H, // top
    centerX + HALF_W, centerY, // right
    centerX, centerY + HALF_H, // bottom
    centerX - HALF_W, centerY, // left
  ];
}
