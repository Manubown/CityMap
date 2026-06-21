/**
 * Convert a screen-space pointer position to the tile under it, going through
 * the camera transform and then the isometric inverse.
 */

import type { Camera } from "./camera";
import { screenToTile } from "../engine/iso";
import type { GridPos } from "../engine/types";

export function pointerToTile(camera: Camera, screenX: number, screenY: number): GridPos {
  const world = camera.screenToWorld(screenX, screenY);
  return screenToTile(world.x, world.y);
}
