import { describe, expect, it, vi } from "vitest";

// Pure functions only — keep the restaurant lookup (and its Prisma import) out of this unit test.
vi.mock("../../src/services/restaurantService.js", () => ({ getActiveRestaurantOrThrow: vi.fn() }));

const { assertArrivalTime, computeArrivalWindow } = await import("../../src/services/arrivalService.js");

// Tests run with BUSINESS_TIMEZONE=UTC (vitest.config.ts).
const restaurant = { opensAt: "09:00", closesAt: "23:00", prepTimeMax: 30 };
const at = (time: string) => new Date(`2026-10-03T${time}:00.000Z`);

describe("computeArrivalWindow", () => {
  it("starts at now + max prep time, rounded up to the 15-minute step, and ends at closing", () => {
    const window = computeArrivalWindow(restaurant, at("10:05")); // 10:35 → 10:45
    expect(window).toMatchObject({ date: "2026-10-03", isOpen: true, earliest: "10:45 AM", latest: "11:00 PM", prepTimeMinutes: 30, stepMinutes: 15 });
    expect(window.suggestedTimes[0]).toBe("10:45 AM");
    expect(window.suggestedTimes.at(-1)).toBe("11:00 PM");
  });

  it("never offers a time before opening", () => {
    expect(computeArrivalWindow(restaurant, at("06:00")).earliest).toBe("9:00 AM");
  });

  it("is closed for the day once prep time runs past closing", () => {
    const window = computeArrivalWindow(restaurant, at("22:40"));
    expect(window).toMatchObject({ isOpen: false, earliest: null, latest: null, suggestedTimes: [] });
  });
});

describe("assertArrivalTime", () => {
  it("accepts a time at least the prep time away and returns today's date", () => {
    expect(assertArrivalTime(restaurant, "10:30", { now: at("10:00") })).toEqual(new Date("2026-10-03T00:00:00.000Z"));
  });

  it("rejects a time inside the prep-time lead", () => {
    expect(() => assertArrivalTime(restaurant, "10:29", { now: at("10:00") })).toThrow(/choose an arrival time of 10:30 AM or later/);
  });

  it("lets a paid order through within the grace minutes", () => {
    expect(() => assertArrivalTime(restaurant, "10:26", { now: at("10:00"), graceMinutes: 5 })).not.toThrow();
    expect(() => assertArrivalTime(restaurant, "10:24", { now: at("10:00"), graceMinutes: 5 })).toThrow();
  });

  it("rejects times outside opening hours", () => {
    expect(() => assertArrivalTime(restaurant, "08:30", { now: at("06:00") })).toThrow(/between 9:00 AM and 11:00 PM/);
    expect(() => assertArrivalTime(restaurant, "23:15", { now: at("10:00") })).toThrow(/between 9:00 AM and 11:00 PM/);
  });

  it("says the restaurant is done for the day when no time is left", () => {
    expect(() => assertArrivalTime(restaurant, "22:50", { now: at("22:45") })).toThrow(/isn't taking more orders today/);
  });
});
