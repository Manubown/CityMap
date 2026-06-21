/**
 * Tiny seeded PRNG (mulberry32). Deterministic given a seed so map generation
 * is reproducible and saves/tests stay stable. We deliberately avoid
 * Math.random() in the simulation.
 */

export interface Rng {
  /** float in [0, 1). */
  next(): number;
  /** integer in [min, max] inclusive. */
  int(min: number, max: number): number;
  /** true with probability p. */
  chance(p: number): boolean;
  /** pick a random element. */
  pick<T>(items: readonly T[]): T;
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  const next = (): number => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    chance: (p) => next() < p,
    pick: (items) => items[Math.floor(next() * items.length)],
  };
}
