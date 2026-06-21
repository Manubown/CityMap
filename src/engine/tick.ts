/**
 * Fixed-timestep simulation clock.
 *
 * Rendering runs on requestAnimationFrame (variable dt); the simulation must
 * advance at a constant rate so it stays deterministic and framerate
 * independent. The render loop feeds real elapsed milliseconds into
 * `SimClock.advance`, which fires `step()` once per due tick.
 */

import type { GameState } from "./types";
import { stepProduction } from "./systems/production";
import { stepPopulation } from "./systems/population";
import { stepRoutes } from "./systems/routes";

export const TICK_RATE = 4; // simulation ticks per second

/**
 * Advance the whole simulation by one tick across every claimed region.
 *
 * Fixed step order (later milestones insert in this order, never reorder):
 *   production -> population -> [research (M2)] -> [skill points (M5)] ->
 *   [agents (M6), per region] -> routes.
 */
export function stepGame(state: GameState): void {
  state.tick++;
  for (const region of state.regions) {
    if (!region.claimed) continue;
    stepProduction(region);
    state.coins += stepPopulation(region); // taxes flow to the global treasury
    // [M6] stepAgents(region) inserts here.
  }
  // [M2] stepResearch(state) and [M5] stepSkillPoints(state) insert here.
  stepRoutes(state);
}

export class SimClock {
  private acc = 0;
  private running = true;

  constructor(public ticksPerSecond: number = TICK_RATE) {}

  get msPerTick(): number {
    return 1000 / this.ticksPerSecond;
  }

  /** Fraction (0..1) into the current tick — for render interpolation (M6). */
  fraction(): number {
    return Math.min(1, this.acc / this.msPerTick);
  }

  isRunning(): boolean {
    return this.running;
  }

  setRunning(value: boolean): void {
    this.running = value;
    if (!value) this.acc = 0; // drop partial accumulation when paused
  }

  /** Feed real elapsed ms; invokes `step` once per due tick. */
  advance(dtMs: number, step: () => void): void {
    if (!this.running) return;
    this.acc += dtMs;
    // Clamp to avoid a "spiral of death" after a long stall / tab switch.
    const maxAcc = this.msPerTick * 5;
    if (this.acc > maxAcc) this.acc = maxAcc;
    while (this.acc >= this.msPerTick) {
      step();
      this.acc -= this.msPerTick;
    }
  }
}
