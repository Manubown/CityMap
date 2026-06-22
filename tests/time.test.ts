import { describe, it, expect } from "vitest";
import {
  dayFraction,
  clockHM,
  calendar,
  dayNumber,
  season,
  worldTint,
  DAY_TICKS,
  DAYS_PER_MONTH,
  SEASON_DAYS,
} from "../src/engine/time";

describe("in-game time", () => {
  it("advances a 24-hour clock and wraps each day", () => {
    expect(clockHM(0)).toEqual(clockHM(DAY_TICKS)); // same time next day
    expect(dayFraction(DAY_TICKS)).toBeCloseTo(dayFraction(0));
    // half a day apart -> ~12h apart
    expect(Math.abs(dayFraction(0) - dayFraction(DAY_TICKS / 2))).toBeCloseTo(0.5);
  });

  it("cycles through four seasons with distinct tints", () => {
    expect(season(0).name).toBe("Spring");
    expect(season(DAY_TICKS * SEASON_DAYS).name).toBe("Summer");
    expect(season(DAY_TICKS * SEASON_DAYS * 2).name).toBe("Autumn");
    expect(season(DAY_TICKS * SEASON_DAYS * 3).name).toBe("Winter");
    expect(season(DAY_TICKS * SEASON_DAYS * 4).name).toBe("Spring"); // wraps
    // same time of day, different season -> different world tint
    expect(worldTint(0)).not.toBe(worldTint(DAY_TICKS * SEASON_DAYS * 2));
  });

  it("counts days and months", () => {
    expect(dayNumber(0)).toBe(1);
    expect(dayNumber(DAY_TICKS)).toBe(2);
    expect(calendar(0)).toEqual({ day: 1, month: 1, dayOfMonth: 1 });
    const m2 = calendar(DAY_TICKS * DAYS_PER_MONTH);
    expect(m2.month).toBe(2);
    expect(m2.dayOfMonth).toBe(1);
  });
});
