import { describe, expect, it, vi } from "vitest";

vi.mock("../../src/config/policy.js", () => ({ policy: { maxBookingLeadDays: 60, businessTimeZone: "Asia/Kolkata" } }));

const { combineDateAndTime, isSlotInPast, isWithinBookingWindow, parseDateOnly } = await import("../../src/utils/dates.js");

describe("dates in the business timezone (Asia/Kolkata)", () => {
  it("treats slot times as IST wall-clock time", () => {
    // 7:00 PM IST = 13:30 UTC
    expect(combineDateAndTime(parseDateOnly("2026-08-25"), "7:00 PM").toISOString()).toBe("2026-08-25T13:30:00.000Z");
  });

  it("marks a 7 PM IST slot as past once 7 PM IST has gone by", () => {
    const date = parseDateOnly("2026-08-25");
    expect(isSlotInPast(date, "19:00", new Date("2026-08-25T13:29:00.000Z"))).toBe(false);
    expect(isSlotInPast(date, "19:00", new Date("2026-08-25T13:31:00.000Z"))).toBe(true);
  });

  it("uses the IST calendar day for 'today' (just after midnight IST)", () => {
    // 2026-08-25 00:30 IST is still 2026-08-24 in UTC
    const now = new Date("2026-08-24T19:00:00.000Z");
    expect(isWithinBookingWindow(parseDateOnly("2026-08-25"), now)).toBe(true);
    expect(isWithinBookingWindow(parseDateOnly("2026-08-24"), now)).toBe(false);
  });
});
