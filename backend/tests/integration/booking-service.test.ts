import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/lib/prisma.js", async () => {
  const { createMockPrisma } = await import("../helpers/mockPrisma.js");
  return { prisma: createMockPrisma() };
});

vi.mock("../../src/queues/reminderQueue.js", () => ({
  scheduleReminder: vi.fn(async () => "job-1"),
  cancelReminder: vi.fn(async () => undefined),
  closeQueues: vi.fn(async () => undefined),
}));

let prisma: any;
let service: typeof import("../../src/services/bookingService.js");

// Tests run with BUSINESS_TIMEZONE=UTC (vitest.config.ts), so wall-clock times below are UTC.
const TODAY = "2026-10-03";
const NOW = new Date(`${TODAY}T10:00:00.000Z`); // 10:00 AM

const activeRestaurant = {
  id: "r1",
  name: "Shree Shyam Restaurant",
  status: "ACTIVE",
  banner: null,
  rating: "4.6",
  cuisineLabel: "Pure Veg",
  latitude: "23.0",
  longitude: "72.5",
  seatingCapacity: 40,
  maxPartySize: 12,
  prepTimeMin: 20,
  prepTimeMax: 30,
  opensAt: "09:00",
  closesAt: "23:00",
};

const baseBooking = (overrides: Record<string, unknown> = {}) => ({
  id: "booking-1",
  humanBookingId: "#SSR260615123",
  restaurantId: "r1",
  restaurantUserId: "customer-A",
  restaurantNameSnapshot: "Shree Shyam Restaurant",
  restaurantImageSnapshot: null,
  ratingSnapshot: "4.6",
  cuisineLabelSnapshot: "Pure Veg",
  distanceKmSnapshot: null,
  date: new Date(`${TODAY}T00:00:00.000Z`),
  time: "13:00",
  people: 4,
  tablePreference: "ANY",
  specialRequest: null,
  fullName: "Rahul Sharma",
  mobileNumber: "+919876543210",
  email: null,
  status: "UPCOMING",
  cancellationReason: null,
  cancelledAt: null,
  cancelledBy: null,
  rejectionReason: null,
  rejectedAt: null,
  acknowledgedAt: null,
  preparingAt: null,
  readyAt: null,
  completedAt: null,
  advancePaid: "99",
  paymentId: "payment-1",
  refundEligible: null,
  refundAmount: null,
  reminderJobId: null,
  createdAt: NOW,
  ...overrides,
});

beforeAll(async () => {
  ({ prisma } = await import("../../src/lib/prisma.js"));
  service = await import("../../src/services/bookingService.js");
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("createBooking", () => {
  const validInput = {
    time: "1:00 PM",
    people: 4,
    fullName: "Rahul Sharma",
    mobileNumber: "+919876543210",
    razorpayOrderId: "order_1",
    razorpayPaymentId: "pay_1",
    preorderItems: [{ menuItemId: "item-1", quantity: 2 }],
  };

  const mockHappyPath = () => {
    prisma.restaurant.findUnique.mockResolvedValue(activeRestaurant);
    prisma.payment.findUnique.mockResolvedValue({ id: "payment-1", restaurantUserId: "customer-A", status: "VERIFIED", razorpayPaymentId: "pay_1", amount: "99" });
    prisma.restaurantBooking.findUnique.mockResolvedValue(null);
    // 2 x 49.50 = 99, matching the verified payment amount.
    prisma.menuItem.findMany.mockResolvedValue([{ id: "item-1", name: "Paneer Tikka", price: "49.50" }]);
    prisma.restaurantBooking.create.mockImplementation((args: any) => baseBooking({ ...args.data }));
    prisma.restaurantBooking.update.mockResolvedValue(baseBooking());
  };

  it("creates a same-day order for the chosen arrival time with status \"upcoming\"", async () => {
    mockHappyPath();
    const result = await service.createBooking("customer-A", "r1", validInput);

    const data = prisma.restaurantBooking.create.mock.calls[0][0].data;
    expect(data.date).toEqual(new Date(`${TODAY}T00:00:00.000Z`));
    expect(data.time).toBe("13:00");
    expect(result.status).toBe("upcoming");
    expect(result.canCancel).toBe(true);
    expect(result.canModify).toBe(true);
  });

  it("snapshots translations, answers in the requested language and notifies in the customer's saved language", async () => {
    mockHappyPath();
    prisma.restaurant.findUnique.mockResolvedValue({ ...activeRestaurant, translations: { hi: { name: "श्री श्याम रेस्टोरेंट", about: "x" }, gu: { name: "શ્રી શ્યામ રેસ્ટોરન્ટ" } } });
    prisma.menuItem.findMany.mockResolvedValue([{ id: "item-1", name: "Paneer Tikka", price: "49.50", translations: { hi: { name: "पनीर टिक्का", description: "y" } } }]);
    prisma.restaurantUser.findUnique.mockResolvedValue({ playerId: null, language: "gu" });

    const result = await service.createBooking("customer-A", "r1", validInput, "hi");

    const data = prisma.restaurantBooking.create.mock.calls[0][0].data;
    expect(data.translationsSnapshot).toEqual({ hi: { name: "श्री श्याम रेस्टोरेंट" }, gu: { name: "શ્રી શ્યામ રેસ્ટોરન્ટ" } });
    expect(data.preorder.create.items.create[0].translations).toEqual({ hi: { name: "पनीर टिक्का" } });
    expect(data.restaurantNameSnapshot).toBe("Shree Shyam Restaurant");
    expect(result.restaurantName).toBe("श्री श्याम रेस्टोरेंट");
    expect(result.statusLabel).toBe("ऑर्डर दिया गया");

    const notification = prisma.notification.create.mock.calls[0][0].data;
    expect(notification.title).toBe("ઓર્ડર આપવામાં આવ્યો");
    expect(notification.body).toContain("શ્રી શ્યામ રેસ્ટોરન્ટ");
  });

  it("falls back to English text when no language or translation exists", async () => {
    mockHappyPath();
    prisma.restaurantUser.findUnique.mockResolvedValue({ playerId: null, language: "en" });
    const result = await service.createBooking("customer-A", "r1", validInput);
    expect(result.restaurantName).toBe("Shree Shyam Restaurant");
    expect(result.statusLabel).toBe("Order placed");
    expect(prisma.notification.create.mock.calls[0][0].data.title).toBe("Order placed");
  });

  it("accepts an explicit date only when it is today", async () => {
    mockHappyPath();
    await expect(service.createBooking("customer-A", "r1", { ...validInput, date: TODAY })).resolves.toBeDefined();
    await expect(service.createBooking("customer-A", "r1", { ...validInput, date: "2026-10-04" })).rejects.toThrow(/only be placed for today/);
  });

  it("rejects an arrival time sooner than now + the restaurant's max prep time", async () => {
    mockHappyPath();
    // 10:00 now + 30 min prep → earliest 10:30; 10:20 is too soon even with the 5-minute paid grace.
    await expect(service.createBooking("customer-A", "r1", { ...validInput, time: "10:20 AM" })).rejects.toThrow(/30 minutes to prepare/);
  });

  it("still accepts a paid order a few minutes inside the prep-time lead (grace period)", async () => {
    mockHappyPath();
    await expect(service.createBooking("customer-A", "r1", { ...validInput, time: "10:27 AM" })).resolves.toBeDefined();
  });

  it("rejects an arrival time outside opening hours", async () => {
    mockHappyPath();
    await expect(service.createBooking("customer-A", "r1", { ...validInput, time: "11:30 PM" })).rejects.toThrow(/between 9:00 AM and 11:00 PM/);
  });

  it("rejects a booking without any menu items", async () => {
    mockHappyPath();
    await expect(service.createBooking("customer-A", "r1", { ...validInput, preorderItems: [] })).rejects.toThrow(/at least one menu item/i);
  });

  it("rejects when the menu items total differs from the paid amount", async () => {
    mockHappyPath();
    await expect(service.createBooking("customer-A", "r1", { ...validInput, preorderItems: [{ menuItemId: "item-1", quantity: 3 }] })).rejects.toThrow(/do not match the paid amount/i);
  });

  it("rejects when the payment has not been verified", async () => {
    mockHappyPath();
    prisma.payment.findUnique.mockResolvedValue({ id: "payment-1", restaurantUserId: "customer-A", status: "CREATED", razorpayPaymentId: "pay_1", amount: "99" });
    await expect(service.createBooking("customer-A", "r1", validInput)).rejects.toThrow(/not been verified/);
  });

  it("rejects when party size exceeds the restaurant's max party size", async () => {
    mockHappyPath();
    await expect(service.createBooking("customer-A", "r1", { ...validInput, people: 99 })).rejects.toThrow(/people must be between/);
  });

  it("rejects reusing a payment that already funded a different booking", async () => {
    mockHappyPath();
    prisma.restaurantBooking.findUnique.mockResolvedValue(baseBooking());
    await expect(service.createBooking("customer-A", "r1", validInput)).rejects.toThrow(/already been used/);
  });

  it("does not schedule a reminder when the reminder moment has already passed", async () => {
    mockHappyPath();
    const { scheduleReminder } = await import("../../src/queues/reminderQueue.js");
    await service.createBooking("customer-A", "r1", validInput); // 1 PM arrival, reminder 2h before = 11 AM → scheduled
    expect(scheduleReminder).toHaveBeenCalledTimes(1);
    await service.createBooking("customer-A", "r1", { ...validInput, time: "11:00 AM" }); // reminder at 9 AM → in the past
    expect(scheduleReminder).toHaveBeenCalledTimes(1);
  });
});

describe("modifyBooking", () => {
  beforeEach(() => {
    prisma.restaurant.findUnique.mockResolvedValue(activeRestaurant);
    prisma.restaurantBooking.updateMany.mockResolvedValue({ count: 1 });
    prisma.restaurantBooking.findUniqueOrThrow.mockImplementation(async () => baseBooking({ time: "14:00" }));
  });

  it("changes the arrival time while the order is still upcoming", async () => {
    prisma.restaurantBooking.findUnique.mockResolvedValue(baseBooking());
    const result = await service.modifyBooking("customer-A", "booking-1", { time: "2:00 PM" });
    expect(prisma.restaurantBooking.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "booking-1", status: { in: ["UPCOMING"] } } }));
    expect(result.time).toBe("2:00 PM");
  });

  it("rejects changes once the restaurant has acknowledged the order", async () => {
    prisma.restaurantBooking.findUnique.mockResolvedValue(baseBooking({ status: "ACKNOWLEDGED" }));
    await expect(service.modifyBooking("customer-A", "booking-1", { people: 2 })).rejects.toThrow(/already accepted/);
  });

  it("rejects a new arrival time that is too soon", async () => {
    prisma.restaurantBooking.findUnique.mockResolvedValue(baseBooking());
    await expect(service.modifyBooking("customer-A", "booking-1", { time: "10:15 AM" })).rejects.toThrow(/to prepare/);
  });

  it("rejects a different customer modifying someone else's booking", async () => {
    prisma.restaurantBooking.findUnique.mockResolvedValue(baseBooking({ restaurantUserId: "customer-B" }));
    await expect(service.modifyBooking("customer-A", "booking-1", { people: 2 })).rejects.toThrow(/do not have access/);
  });
});

describe("cancelBooking (customer)", () => {
  beforeEach(() => {
    prisma.restaurantBooking.updateMany.mockResolvedValue({ count: 1 });
    prisma.restaurantBooking.findUniqueOrThrow.mockResolvedValue(baseBooking({ status: "CANCELLED", cancelledBy: "CUSTOMER", refundEligible: true, refundAmount: "99" }));
  });

  it.each(["UPCOMING", "ACKNOWLEDGED"])("allows cancelling a %s order with a full refund", async (status) => {
    prisma.restaurantBooking.findUnique.mockResolvedValue(baseBooking({ status }));
    const result = await service.cancelBooking("customer-A", "booking-1", "Change of plans");
    expect(result.refund).toEqual({ eligible: true, amount: 99 });
    expect(result.booking.status).toBe("cancelled");
    expect(result.booking.cancelledBy).toBe("customer");
    expect(prisma.restaurantBooking.updateMany.mock.calls[0][0].data).toMatchObject({ status: "CANCELLED", cancelledBy: "CUSTOMER" });
  });

  it.each(["PREPARING", "READY"])("refuses to cancel once the order is %s", async (status) => {
    prisma.restaurantBooking.findUnique.mockResolvedValue(baseBooking({ status }));
    await expect(service.cancelBooking("customer-A", "booking-1", "Change of plans")).rejects.toThrow(/already being prepared/);
    expect(prisma.restaurantBooking.updateMany).not.toHaveBeenCalled();
  });

  it("loses the race cleanly when the restaurant starts preparing at the same moment", async () => {
    prisma.restaurantBooking.findUnique.mockResolvedValueOnce(baseBooking({ status: "ACKNOWLEDGED" })).mockResolvedValueOnce({ status: "PREPARING" });
    prisma.restaurantBooking.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.cancelBooking("customer-A", "booking-1", "Change of plans")).rejects.toThrow(/already being prepared/);
  });

  it("rejects cancelling an already-cancelled booking", async () => {
    prisma.restaurantBooking.findUnique.mockResolvedValue(baseBooking({ status: "CANCELLED" }));
    await expect(service.cancelBooking("customer-A", "booking-1", "Change of plans")).rejects.toThrow(/already cancelled/);
  });

  it("rejects an invalid cancellation reason", async () => {
    await expect(service.cancelBooking("customer-A", "booking-1", "Because")).rejects.toThrow(/Invalid cancellation reason/);
  });
});

describe("restaurant status actions", () => {
  beforeEach(() => {
    prisma.restaurantBooking.updateMany.mockResolvedValue({ count: 1 });
  });

  it.each([
    ["UPCOMING", "ACKNOWLEDGED", "acknowledgedAt"],
    ["ACKNOWLEDGED", "PREPARING", "preparingAt"],
    ["PREPARING", "READY", "readyAt"],
    ["READY", "COMPLETED", "completedAt"],
  ])("moves %s → %s and stamps %s", async (from, to, timestamp) => {
    prisma.restaurantBooking.findUnique.mockResolvedValue(baseBooking({ status: from }));
    prisma.restaurantBooking.findUniqueOrThrow.mockResolvedValue(baseBooking({ status: to }));

    const result = await service.advanceBookingStatus("booking-1", to as any);

    const call = prisma.restaurantBooking.updateMany.mock.calls[0][0];
    expect(call.where).toEqual({ id: "booking-1", status: { in: [from] } });
    expect(call.data.status).toBe(to);
    expect(call.data[timestamp]).toBeInstanceOf(Date);
    expect(result.booking.status).toBe(to.toLowerCase());
  });

  it("refuses to skip a step (upcoming straight to ready)", async () => {
    prisma.restaurantBooking.findUnique.mockResolvedValue(baseBooking({ status: "UPCOMING" }));
    await expect(service.advanceBookingStatus("booking-1", "READY")).rejects.toThrow(/is upcoming, so it can't be marked ready/);
  });

  it("refuses to move a cancelled order forward", async () => {
    prisma.restaurantBooking.findUnique.mockResolvedValue(baseBooking({ status: "CANCELLED" }));
    await expect(service.advanceBookingStatus("booking-1", "ACKNOWLEDGED")).rejects.toThrow(/is cancelled/);
  });

  it("rejects only a new (upcoming) order, with a reason and a full refund", async () => {
    prisma.restaurantBooking.findUnique.mockResolvedValue(baseBooking({ status: "UPCOMING" }));
    prisma.restaurantBooking.findUniqueOrThrow.mockResolvedValue(baseBooking({ status: "REJECTED", rejectionReason: "Kitchen closed", refundEligible: true, refundAmount: "99" }));

    const result = await service.rejectBooking("booking-1", "Kitchen closed");
    expect(prisma.restaurantBooking.updateMany.mock.calls[0][0].data).toMatchObject({ status: "REJECTED", rejectionReason: "Kitchen closed", refundEligible: true, refundAmount: 99 });
    expect(result.booking.status).toBe("rejected");
    expect(result.booking.rejectionReason).toBe("Kitchen closed");
    expect(result.booking.refund).toEqual({ eligible: true, amount: 99 });
  });

  it("refuses to reject an order that was already acknowledged", async () => {
    prisma.restaurantBooking.findUnique.mockResolvedValue(baseBooking({ status: "ACKNOWLEDGED" }));
    await expect(service.rejectBooking("booking-1")).rejects.toThrow(/Only new orders can be rejected/);
  });

  it.each(["UPCOMING", "ACKNOWLEDGED", "PREPARING", "READY"])("lets the restaurant cancel a %s order", async (status) => {
    prisma.restaurantBooking.findUnique.mockResolvedValue(baseBooking({ status }));
    prisma.restaurantBooking.findUniqueOrThrow.mockResolvedValue(baseBooking({ status: "CANCELLED", cancelledBy: "RESTAURANT" }));
    const result = await service.adminCancelBooking("booking-1", "Other");
    expect(prisma.restaurantBooking.updateMany.mock.calls[0][0].data).toMatchObject({ status: "CANCELLED", cancelledBy: "RESTAURANT" });
    expect(result.refund).toEqual({ eligible: true, amount: 99 });
  });

  it("refuses to cancel a completed order", async () => {
    prisma.restaurantBooking.findUnique.mockResolvedValue(baseBooking({ status: "COMPLETED" }));
    await expect(service.adminCancelBooking("booking-1", "Other")).rejects.toThrow(/already completed/);
  });
});

describe("listMyBookings", () => {
  it("splits active and past orders by status", async () => {
    prisma.restaurantBooking.findMany.mockResolvedValue([]);
    await service.listMyBookings("customer-A", "active");
    expect(prisma.restaurantBooking.findMany.mock.calls[0][0].where).toEqual({ restaurantUserId: "customer-A", status: { in: ["UPCOMING", "ACKNOWLEDGED", "PREPARING", "READY"] } });
    await service.listMyBookings("customer-A", "past");
    expect(prisma.restaurantBooking.findMany.mock.calls[1][0].where).toEqual({ restaurantUserId: "customer-A", status: { in: ["COMPLETED", "CANCELLED", "REJECTED"] } });
  });
});

describe("listBookingsForAdmin", () => {
  it("filters by date range and search, sorts soonest first and paginates in the database", async () => {
    prisma.restaurantBooking.findMany.mockResolvedValue([baseBooking()]);
    prisma.restaurantBooking.count.mockResolvedValue(41);

    const result = await service.listBookingsForAdmin({ restaurantId: "r1", from: "2026-10-02", to: "2026-10-09", search: "rahul", sort: "asc", page: 3, limit: 20 });

    const args = prisma.restaurantBooking.findMany.mock.calls[0][0];
    expect(args.orderBy).toEqual([{ date: "asc" }, { time: "asc" }, { createdAt: "asc" }]);
    expect(args.skip).toBe(40);
    expect(args.take).toBe(20);
    expect(args.where.AND).toEqual(
      expect.arrayContaining([
        { restaurantId: "r1" },
        { date: { gte: new Date("2026-10-02T00:00:00.000Z"), lte: new Date("2026-10-09T00:00:00.000Z") } },
        { OR: [{ fullName: { contains: "rahul" } }, { mobileNumber: { contains: "rahul" } }, { humanBookingId: { contains: "rahul" } }] },
      ]),
    );
    expect(prisma.restaurantBooking.count).toHaveBeenCalledWith({ where: args.where });
    expect(result.total).toBe(41);
    expect(result.bookings).toHaveLength(1);
  });

  it("filters by a single status or by every active status", async () => {
    prisma.restaurantBooking.findMany.mockResolvedValue([]);
    prisma.restaurantBooking.count.mockResolvedValue(0);

    await service.listBookingsForAdmin({ status: "preparing", page: 1, limit: 20 });
    expect(prisma.restaurantBooking.findMany.mock.calls[0][0].where.AND).toContainEqual({ status: "PREPARING" });

    await service.listBookingsForAdmin({ status: "active", page: 1, limit: 20 });
    expect(prisma.restaurantBooking.findMany.mock.calls[1][0].where.AND).toContainEqual({ status: { in: ["UPCOMING", "ACKNOWLEDGED", "PREPARING", "READY"] } });
  });

  it("rejects an invalid date bound", async () => {
    await expect(service.listBookingsForAdmin({ from: "2026-13-45", page: 1, limit: 20 })).rejects.toThrow(/invalid date/i);
  });
});
