/**
 * 2D camera over the world container. Holds pan (x,y) + zoom and writes them
 * onto a Pixi Container. Screen <-> world conversions live here so picking and
 * input share one source of truth.
 *
 *   screen = world * zoom + offset
 *   world  = (screen - offset) / zoom
 */

import type { Container } from "pixi.js";

export interface WorldBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export class Camera {
  x = 0;
  y = 0;
  zoom = 1;
  minZoom = 0.35;
  maxZoom = 2.5;

  constructor(private bounds: WorldBounds) {}

  apply(container: Container): void {
    container.position.set(this.x, this.y);
    container.scale.set(this.zoom);
  }

  screenToWorld(sx: number, sy: number): { x: number; y: number } {
    return { x: (sx - this.x) / this.zoom, y: (sy - this.y) / this.zoom };
  }

  panBy(dx: number, dy: number): void {
    this.x += dx;
    this.y += dy;
  }

  /** Zoom by `factor` while keeping the world point under (sx,sy) fixed. */
  zoomAt(factor: number, sx: number, sy: number): void {
    const next = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom * factor));
    if (next === this.zoom) return;
    const world = this.screenToWorld(sx, sy);
    this.zoom = next;
    this.x = sx - world.x * this.zoom;
    this.y = sy - world.y * this.zoom;
  }

  /** Centre the camera on a world point in a viewport of the given size. */
  centerOn(worldX: number, worldY: number, viewW: number, viewH: number): void {
    this.x = viewW / 2 - worldX * this.zoom;
    this.y = viewH / 2 - worldY * this.zoom;
  }

  /**
   * Keep the world's centre within the viewport so the map can't be lost.
   * Loose on purpose — generous panning, but never fully off-screen.
   */
  clamp(viewW: number, viewH: number): void {
    const cx = (this.bounds.minX + this.bounds.maxX) / 2;
    const cy = (this.bounds.minY + this.bounds.maxY) / 2;
    const screenCx = cx * this.zoom + this.x;
    const screenCy = cy * this.zoom + this.y;

    const marginX = viewW * 0.15;
    const marginY = viewH * 0.15;
    if (screenCx < marginX) this.x += marginX - screenCx;
    if (screenCx > viewW - marginX) this.x -= screenCx - (viewW - marginX);
    if (screenCy < marginY) this.y += marginY - screenCy;
    if (screenCy > viewH - marginY) this.y -= screenCy - (viewH - marginY);
  }
}
