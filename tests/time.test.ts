import { describe, it, expect } from "vitest";
import {
  dayFraction,
  clockHM,
  calendar,
  dayNumber,
  DAY_TICKS,
  DAYS_PER_MONTH,
} from "../src/engine/time";

describe("in-game time", () => {
  it("advances a 24-hour clock and wraps each day", () => {
    expect(clockHM(0)).toEqual(clockHM(DAY_TICKS)); // same time next day
    expect(dayFraction(DAY_TICKS)).toBeCloseTo(dayFraction(0));
    // half a day apart -> ~12h apart
    expect(Math.abs(dayFraction(0) - dayFraction(DAY_TICKS / 2))).toBeCloseTo(0.5);
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
