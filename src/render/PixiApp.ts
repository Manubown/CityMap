/**
 * GameRenderer — owns the PixiJS Application and the world scene graph
 * (terrain / entities / overlay under a camera container), translates DOM
 * input into camera moves + tile callbacks, and exposes a small API the game
 * controller drives. It renders state; it never mutates the simulation.
 */

import { Application, Assets, Container, type Texture } from "pixi.js";
import type { BuildingTypeId, GridPos, Region } from "../engine/types";
import { TILE_W, TILE_H, gridToScreen } from "../engine/iso";
import { dayTint } from "../engine/time";
import { tileAt } from "../engine/map/generate";
import { getBuildingDef } from "../engine/buildings/registry";
import { TERRAIN_COLORS } from "./shapes";
import { Camera, type WorldBounds } from "./camera";
import { pointerToTile } from "./picking";
import { buildTerrainLayer, TERRAIN_SPRITE_PATHS } from "./TerrainLayer";
import { EntityLayer, DECOR_SPRITE_PATHS } from "./EntityLayer";
import { AgentLayer } from "./AgentLayer";
import { StatusLayer } from "./StatusLayer";
import { PathLayer } from "./PathLayer";
import { Overlay } from "./ghost";

const BUILDING_IDS: BuildingTypeId[] = [
  "town_center",
  "hut",
  "forester",
  "gatherer",
  "quarry",
  "toolmaker",
  "storage",
];

const HALF_W = TILE_W / 2;
const HALF_H = TILE_H / 2;
const DRAG_THRESHOLD = 5; // px before a press becomes a pan instead of a click
const KEY_PAN_SPEED = 700; // px/sec at zoom 1

export class GameRenderer {
  readonly app = new Application();
  private world = new Container();
  private terrain = new Container();
  private entities!: EntityLayer;
  private pathLayer = new PathLayer();
  private agentLayer = new AgentLayer();
  private statusLayer = new StatusLayer();
  private overlay = new Overlay();
  private elapsed = 0;
  private camera!: Camera;
  private region: Region | null = null;
  private initialized = false;
  private textures = new Map<string, Texture>();

  private keys = new Set<string>();
  private pointerDown = false;
  private pointerButton = 0;
  private dragMoved = false;
  private downX = 0;
  private downY = 0;
  private lastX = 0;
  private lastY = 0;
  private pointers = new Map<number, { x: number; y: number }>();
  private pinchDist = 0;

  onHoverTile?: (tile: GridPos | null) => void;
  onClickTile?: (tile: GridPos, button: number) => void;
  onCancel?: () => void;
  onRotate?: () => void;

  async init(parent: HTMLElement): Promise<void> {
    await this.app.init({
      background: 0x14202b,
      resizeTo: parent,
      antialias: true,
      autoDensity: true,
      resolution: window.devicePixelRatio || 1,
    });
    parent.appendChild(this.app.canvas);
    this.app.canvas.style.touchAction = "none";
    this.app.canvas.style.display = "block";

    await this.loadAssets();
    this.entities = new EntityLayer((type) => this.textures.get("building/" + type));

    this.world.addChild(this.terrain);
    this.world.addChild(this.pathLayer.container);
    this.world.addChild(this.entities.container);
    this.world.addChild(this.agentLayer.container);
    this.world.addChild(this.statusLayer.container);
    this.world.addChild(this.overlay.container);
    this.app.stage.addChild(this.world);

    this.bindInput();
    this.app.ticker.add((ticker) => this.update(ticker.deltaMS));
    this.initialized = true;
  }

  /** Load building + terrain sprites; missing ones fall back to Graphics. */
  private async loadAssets(): Promise<void> {
    const jobs: Array<[string, string]> = [
      ...BUILDING_IDS.map((b) => [`building/${b}`, `/assets/buildings/${b}.png`] as [string, string]),
      // terrain + decoration textures are keyed by their relative path
      ...TERRAIN_SPRITE_PATHS.map((p) => [p, `/assets/${p}`] as [string, string]),
      ...DECOR_SPRITE_PATHS.map((p) => [p, `/assets/${p}`] as [string, string]),
    ];
    await Promise.all(
      jobs.map(async ([key, url]) => {
        try {
          this.textures.set(key, await Assets.load(url));
        } catch (e) {
          console.warn("Asset failed to load, using placeholder:", url, e);
        }
      }),
    );
  }

  /** Attach a region: (re)build terrain + decor, sync buildings, centre camera. */
  attachRegion(region: Region): void {
    this.region = region;

    this.world.removeChild(this.terrain);
    this.terrain.destroy({ children: true });
    this.terrain = buildTerrainLayer(region.map, (path) => this.textures.get(path));
    this.world.addChildAt(this.terrain, 0);

    this.entities.clear();
    this.entities.sync(region);
    this.entities.setDecor(region.map, (path) => this.textures.get(path));
    this.agentLayer.clear();
    this.pathLayer.clear();
    this.overlay.attach(region);

    const bounds = this.worldBounds(region);
    this.camera = new Camera(bounds);
    const center = gridToScreen((region.map.width - 1) / 2, (region.map.height - 1) / 2);
    this.camera.centerOn(center.x, center.y, this.app.screen.width, this.app.screen.height);
    this.camera.apply(this.world);
  }

  /** Re-sync the building graphics from the active region (after place/remove). */
  syncEntities(): void {
    if (this.region) this.entities.sync(this.region);
  }

  /** Reposition villager dots, interpolated by the sim-clock fraction (0..1). */
  updateAgents(fraction: number): void {
    this.agentLayer.update(this.region, fraction);
  }

  /** Tint the world for the time of day (day/night cycle). */
  setDayNight(tick: number): void {
    this.world.tint = dayTint(tick);
  }

  /** Centre the camera on a fraction (0..1) of the region's grid (minimap jump). */
  panToFraction(fx: number, fy: number): void {
    if (!this.camera || !this.region) return;
    const p = gridToScreen(fx * this.region.map.width, fy * this.region.map.height);
    this.camera.centerOn(p.x, p.y, this.app.screen.width, this.app.screen.height);
    this.camera.apply(this.world);
  }

  /** Draw a top-down grid overview (terrain + buildings + viewport) to a canvas. */
  drawMinimap(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    ctx.clearRect(0, 0, w, h);
    if (!this.region) return;
    const map = this.region.map;
    const sx = w / map.width;
    const sy = h / map.height;
    const cw = Math.ceil(sx);
    const ch = Math.ceil(sy);
    for (let row = 0; row < map.height; row++) {
      for (let col = 0; col < map.width; col++) {
        const t = tileAt(map, col, row);
        if (!t) continue;
        ctx.fillStyle = `#${TERRAIN_COLORS[t.terrain].toString(16).padStart(6, "0")}`;
        ctx.fillRect(col * sx, row * sy, cw, ch);
      }
    }
    ctx.fillStyle = "#f2e4bd";
    for (const b of Object.values(this.region.buildings)) {
      const { w: fw, h: fh } = getBuildingDef(b.type).footprint;
      ctx.fillRect(b.col * sx, b.row * sy, Math.ceil(fw * sx), Math.ceil(fh * sy));
    }
    if (this.camera) {
      const sw = this.app.screen.width;
      const sh = this.app.screen.height;
      const corners = [
        pointerToTile(this.camera, 0, 0),
        pointerToTile(this.camera, sw, 0),
        pointerToTile(this.camera, sw, sh),
        pointerToTile(this.camera, 0, sh),
      ];
      const cols = corners.map((c) => c.col);
      const rows = corners.map((c) => c.row);
      const minC = Math.min(...cols);
      const minR = Math.min(...rows);
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(
        minC * sx,
        minR * sy,
        (Math.max(...cols) - minC) * sx,
        (Math.max(...rows) - minR) * sy,
      );
    }
  }

  /** Rebuild terrain + decoration after a tile edit (clearing), keeping camera. */
  rebuildTerrain(): void {
    if (!this.region) return;
    this.world.removeChild(this.terrain);
    this.terrain.destroy({ children: true });
    this.terrain = buildTerrainLayer(this.region.map, (path) => this.textures.get(path));
    this.world.addChildAt(this.terrain, 0);
    this.entities.setDecor(this.region.map, (path) => this.textures.get(path));
  }

  setGhost(type: BuildingTypeId | null, facing = 0): void {
    this.overlay.setGhost(type, facing);
  }

  setSelection(id: string | null): void {
    this.overlay.setSelection(id);
  }

  destroy(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    if (this.initialized) this.app.destroy(true, { children: true });
  }

  // --- internals -----------------------------------------------------------

  private worldBounds(region: Region): WorldBounds {
    const { width: w, height: h } = region.map;
    return {
      minX: -(h - 1) * HALF_W - HALF_W,
      maxX: (w - 1) * HALF_W + HALF_W,
      minY: -HALF_H,
      maxY: (w + h - 2) * HALF_H + HALF_H,
    };
  }

  private update(dtMs: number): void {
    this.elapsed += dtMs;
    this.statusLayer.update(this.region, this.elapsed);
    this.pathLayer.update(this.region);
    if (!this.camera) return;
    const dt = dtMs / 1000;
    const step = (KEY_PAN_SPEED * dt) / this.camera.zoom;
    let dx = 0;
    let dy = 0;
    if (this.keys.has("a") || this.keys.has("arrowleft")) dx += step;
    if (this.keys.has("d") || this.keys.has("arrowright")) dx -= step;
    if (this.keys.has("w") || this.keys.has("arrowup")) dy += step;
    if (this.keys.has("s") || this.keys.has("arrowdown")) dy -= step;
    if (dx !== 0 || dy !== 0) this.camera.panBy(dx * this.camera.zoom, dy * this.camera.zoom);

    this.camera.clamp(this.app.screen.width, this.app.screen.height);
    this.camera.apply(this.world);
  }

  private bindInput(): void {
    const canvas = this.app.canvas;
    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointermove", this.onPointerMove);
    canvas.addEventListener("pointerup", this.onPointerUp);
    canvas.addEventListener("pointerleave", this.onPointerLeave);
    canvas.addEventListener("wheel", this.onWheel, { passive: false });
    canvas.addEventListener("contextmenu", this.onContextMenu);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
  }

  private tileFromEvent(e: PointerEvent | WheelEvent): GridPos {
    return pointerToTile(this.camera, e.offsetX, e.offsetY);
  }

  private onPointerDown = (e: PointerEvent): void => {
    this.pointers.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
    this.pointerDown = true;
    this.pointerButton = e.button;
    this.dragMoved = false;
    this.downX = this.lastX = e.offsetX;
    this.downY = this.lastY = e.offsetY;
    this.app.canvas.setPointerCapture?.(e.pointerId);
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.camera) return;
    if (this.pointers.has(e.pointerId)) this.pointers.set(e.pointerId, { x: e.offsetX, y: e.offsetY });

    // Two-finger pinch to zoom.
    if (this.pointers.size >= 2) {
      const pts = [...this.pointers.values()];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (this.pinchDist > 0 && dist > 0) {
        this.camera.zoomAt(dist / this.pinchDist, (pts[0].x + pts[1].x) / 2, (pts[0].y + pts[1].y) / 2);
      }
      this.pinchDist = dist;
      this.dragMoved = true; // suppress tap-to-place during a pinch
      return;
    }

    const dx = e.offsetX - this.lastX;
    const dy = e.offsetY - this.lastY;
    this.lastX = e.offsetX;
    this.lastY = e.offsetY;

    if (this.pointerDown && (this.pointerButton === 0 || this.pointerButton === 1)) {
      this.camera.panBy(dx, dy);
      if (Math.hypot(e.offsetX - this.downX, e.offsetY - this.downY) > DRAG_THRESHOLD) {
        this.dragMoved = true;
      }
    }

    const tile = this.tileFromEvent(e);
    this.overlay.setHover(tile);
    this.onHoverTile?.(tile);
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (this.pointerDown && !this.dragMoved && e.button === 0 && this.pointers.size < 2) {
      this.onClickTile?.(this.tileFromEvent(e), e.button);
    }
    this.pointers.delete(e.pointerId);
    if (this.pointers.size < 2) this.pinchDist = 0;
    this.pointerDown = false;
    this.app.canvas.releasePointerCapture?.(e.pointerId);
  };

  private onPointerLeave = (): void => {
    this.pointers.clear();
    this.pinchDist = 0;
    this.pointerDown = false;
    this.overlay.setHover(null);
    this.onHoverTile?.(null);
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    this.camera.zoomAt(factor, e.offsetX, e.offsetY);
  };

  private onContextMenu = (e: MouseEvent): void => {
    e.preventDefault();
    this.onCancel?.();
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    const k = e.key.toLowerCase();
    if (k === "escape") this.onCancel?.();
    if (k === "r") this.onRotate?.();
    this.keys.add(k);
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.key.toLowerCase());
  };
}
