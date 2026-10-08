import { describe, expect, it, vi } from "vitest";

vi.mock("../../src/config/policy.js", () => ({ policy: { arrivalStepMinutes: 15, paidBookingGraceMinutes: 5, businessTimeZone: "Asia/Kolkata" } }));
vi.mock("../../src/services/restaurantService.js", () => ({ getActiveRestaurantOrThrow: vi.fn() }));

const { businessNow, combineDateAndTime, parseDateOnly } = await import("../../src/utils/dates.js");
const { assertArrivalTime, computeArrivalWindow } = await import("../../src/services/arrivalService.js");

const restaurant = { opensAt: "09:00", closesAt: "23:00", prepTimeMax: 30 };

describe("dates in the business timezone (Asia/Kolkata)", () => {
  it("treats arrival times as IST wall-clock time", () => {
    // 7:00 PM IST = 13:30 UTC
    expect(combineDateAndTime(parseDateOnly("2026-08-25"), "7:00 PM").toISOString()).toBe("2026-08-25T13:30:00.000Z");
  });

  it("uses the IST calendar day for 'today' (just after midnight IST)", () => {
    // 2026-08-25 00:30 IST is still 2026-08-24 in UTC
    expect(businessNow(new Date("2026-08-24T19:00:00.000Z"))).toEqual({ date: new Date("2026-08-25T00:00:00.000Z"), time: "00:30" });
  });

  it("computes the arrival window in IST", () => {
    // 12:10 PM IST (06:40 UTC) + 30 min prep → 12:40 → rounded to 12:45 PM
    expect(computeArrivalWindow(restaurant, new Date("2026-08-25T06:40:00.000Z")).earliest).toBe("12:45 PM");
  });

  it("enforces the prep-time lead against IST arrival times", () => {
    const now = new Date("2026-08-25T13:00:00.000Z"); // 6:30 PM IST
    expect(() => assertArrivalTime(restaurant, "19:00", { now })).not.toThrow();
    expect(() => assertArrivalTime(restaurant, "18:59", { now })).toThrow(/to prepare/);
  });
});
