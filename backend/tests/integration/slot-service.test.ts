import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("../../src/lib/prisma.js", async () => {
  const { createMockPrisma } = await import("../helpers/mockPrisma.js");
  return { prisma: createMockPrisma() };
});

let prisma: any;
let getAvailableSlots: typeof import("../../src/services/slotService.js").getAvailableSlots;

const tomorrow = () => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
};

const activeRestaurant = { id: "r1", status: "ACTIVE", seatingCapacity: 10, maxPartySize: 12 };

beforeAll(async () => {
  ({ prisma } = await import("../../src/lib/prisma.js"));
  ({ getAvailableSlots } = await import("../../src/services/slotService.js"));
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("getAvailableSlots", () => {
  it("rejects a malformed date", async () => {
    prisma.restaurant.findUnique.mockResolvedValue(activeRestaurant);
    await expect(getAvailableSlots("r1", "not-a-date", 2)).rejects.toThrow(/invalid date/i);
  });

  it("rejects a date more than 60 days out", async () => {
    prisma.restaurant.findUnique.mockResolvedValue(activeRestaurant);
    const farFuture = new Date();
    farFuture.setDate(farFuture.getDate() + 90);
    await expect(getAvailableSlots("r1", farFuture.toISOString().slice(0, 10), 2)).rejects.toThrow(/60 days/);
  });

  it("marks a slot unavailable once capacity is exhausted for the requested party size", async () => {
    prisma.restaurant.findUnique.mockResolvedValue(activeRestaurant);
    prisma.slotConfiguration.findMany.mockResolvedValue([
      { id: "s1", meal: "LUNCH", time: "12:00", sortOrder: 0, isActive: true },
      { id: "s2", meal: "LUNCH", time: "12:30", sortOrder: 1, isActive: true },
    ]);
    prisma.restaurantBooking.groupBy.mockResolvedValue([{ time: "12:00", _sum: { people: 9 } }]);

    const result = await getAvailableSlots("r1", tomorrow(), 2);

    const lunch = result.groups.find((g: any) => g.label === "Lunch");
    const slot1200 = lunch.slots.find((s: any) => s.time === "12:00 PM");
    const slot1230 = lunch.slots.find((s: any) => s.time === "12:30 PM");

    expect(slot1200.available).toBe(false); // 10 - 9 = 1 seat left, need 2
    expect(slot1200.seatsLeft).toBeUndefined();
    expect(slot1230.available).toBe(true); // no bookings yet, 10 seats left
    expect(slot1230.seatsLeft).toBe(10);
  });

  it("groups slots by meal label and reports maxPeople from the restaurant", async () => {
    prisma.restaurant.findUnique.mockResolvedValue(activeRestaurant);
    prisma.slotConfiguration.findMany.mockResolvedValue([
      { id: "s1", meal: "LUNCH", time: "12:00", sortOrder: 0, isActive: true },
      { id: "s2", meal: "DINNER", time: "19:00", sortOrder: 0, isActive: true },
    ]);
    prisma.restaurantBooking.groupBy.mockResolvedValue([]);

    const result = await getAvailableSlots("r1", tomorrow(), 1);

    expect(result.groups.map((g: any) => g.label).sort()).toEqual(["Dinner", "Lunch"]);
    expect(result.maxPeople).toBe(12);
  });

  it("rejects a past date", async () => {
    prisma.restaurant.findUnique.mockResolvedValue(activeRestaurant);
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    await expect(getAvailableSlots("r1", yesterday.toISOString().slice(0, 10), 2)).rejects.toThrow(/between today/);
  });

  it("marks today's slots whose time has already passed as unavailable", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-22T15:10:00.000Z"));
    try {
      prisma.restaurant.findUnique.mockResolvedValue(activeRestaurant);
      prisma.slotConfiguration.findMany.mockResolvedValue([
        { id: "s1", meal: "LUNCH", time: "12:00", sortOrder: 0, isActive: true },
        { id: "s2", meal: "DINNER", time: "15:00", sortOrder: 0, isActive: true },
        { id: "s3", meal: "DINNER", time: "19:00", sortOrder: 1, isActive: true },
      ]);
      prisma.restaurantBooking.groupBy.mockResolvedValue([]);

      const result = await getAvailableSlots("r1", "2026-08-22", 2);
      const slots = result.groups.flatMap((g: any) => g.slots);
      const byTime = Object.fromEntries(slots.map((s: any) => [s.time, s]));

      expect(byTime["12:00 PM"].available).toBe(false);
      expect(byTime["3:00 PM"].available).toBe(false);
      expect(byTime["7:00 PM"].available).toBe(true);
      expect(byTime["7:00 PM"].seatsLeft).toBe(10);
    } finally {
      vi.useRealTimers();
    }
  });
});
