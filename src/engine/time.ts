/**
 * In-game time. The world runs on a 24-hour day derived from the global sim
 * tick: DAY_TICKS ticks per day. Pure helpers — used by the clock UI, the
 * villager schedule, and the day/night tint. Deterministic (a function of tick).
 */

export const DAY_TICKS = 240; // ticks per in-game day (~60s at TICK_RATE 4)
export const DAYS_PER_MONTH = 30;
const DAY_START = 0.3; // a fresh game (tick 0) begins at ~07:00, not midnight

/** 0..1 through the day. 0 = midnight, 0.5 = noon. */
export function dayFraction(tick: number): number {
  const base = (((tick % DAY_TICKS) + DAY_TICKS) % DAY_TICKS) / DAY_TICKS;
  return (base + DAY_START) % 1;
}

export function clockHM(tick: number): { hour: number; minute: number } {
  const totalMin = Math.floor(dayFraction(tick) * 24 * 60);
  return { hour: Math.floor(totalMin / 60), minute: totalMin % 60 };
}

/** 1-based day number since the game began. */
export function dayNumber(tick: number): number {
  return Math.floor(tick / DAY_TICKS) + 1;
}

export function calendar(tick: number): { day: number; month: number; dayOfMonth: number } {
  const day = dayNumber(tick);
  return {
    day,
    month: Math.floor((day - 1) / DAYS_PER_MONTH) + 1,
    dayOfMonth: ((day - 1) % DAYS_PER_MONTH) + 1,
  };
}

/** Roughly: is it dark out? (before dawn / after dusk) */
export function isNight(tick: number): boolean {
  const f = dayFraction(tick);
  return f < 0.27 || f > 0.8;
}

// Day/night ambient tint keyframes [fraction, 0xRRGGBB].
const TINT_KEYS: [number, number][] = [
  [0.0, 0x2b3566], // midnight — deep blue
  [0.24, 0x5a5380], // pre-dawn
  [0.3, 0xffb27a], // sunrise — warm
  [0.36, 0xffffff], // morning — full light
  [0.64, 0xffffff], // afternoon
  [0.74, 0xff9d6a], // sunset — warm
  [0.82, 0x554f7a], // dusk
  [0.9, 0x2b3566], // night
  [1.0, 0x2b3566],
];

function lerpChannel(a: number, b: number, sh: number, t: number): number {
  const ca = (a >> sh) & 0xff;
  const cb = (b >> sh) & 0xff;
  return Math.round(ca + (cb - ca) * t);
}

/** Multiplicative tint colour for the world container at this time of day. */
export function dayTint(tick: number): number {
  const f = dayFraction(tick);
  for (let i = 0; i < TINT_KEYS.length - 1; i++) {
    const [f0, c0] = TINT_KEYS[i];
    const [f1, c1] = TINT_KEYS[i + 1];
    if (f >= f0 && f <= f1) {
      const t = f1 === f0 ? 0 : (f - f0) / (f1 - f0);
      return (
        (lerpChannel(c0, c1, 16, t) << 16) |
        (lerpChannel(c0, c1, 8, t) << 8) |
        lerpChannel(c0, c1, 0, t)
      );
    }
  }
  return 0xffffff;
}
