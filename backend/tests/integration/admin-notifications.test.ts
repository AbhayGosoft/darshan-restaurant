import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";

vi.mock("../../src/lib/prisma.js", async () => {
  const { createMockPrisma } = await import("../helpers/mockPrisma.js");
  return { prisma: createMockPrisma() };
});

let app: import("express").Express;
let prisma: any;
let signAdminToken: typeof import("../../src/middleware/auth.js").signAdminToken;
let clientKey: string;

beforeAll(async () => {
  ({ app } = await import("../../src/app.js"));
  ({ prisma } = await import("../../src/lib/prisma.js"));
  ({ signAdminToken } = await import("../../src/middleware/auth.js"));
  ({ env: { appClientKey: clientKey } } = (await import("../../src/config/env.js")) as any);
});

afterEach(() => {
  vi.clearAllMocks();
});

const asAdmin = (role: "ADMIN" | "SUPERADMIN", method: "get" | "post", path: string) => {
  prisma.adminUser.findUnique.mockResolvedValue({ id: "admin-1", email: "a@b.com", role, status: "ACTIVE" });
  const token = signAdminToken({ sub: "admin-1", email: "a@b.com", role });
  return request(app)[method](path).set("x-client-key", clientKey).set("Authorization", `Bearer ${token}`);
};

const booking = (overrides: Record<string, unknown> = {}) => ({
  id: "booking-1",
  humanBookingId: "#BBC261005123",
  restaurantId: "r1",
  restaurantNameSnapshot: "Bites & Brews Cafe",
  restaurantImageSnapshot: null,
  fullName: "Rahul Sharma",
  people: 4,
  date: new Date("2026-10-05T00:00:00.000Z"),
  time: "19:30",
  status: "UPCOMING",
  advancePaid: "747",
  preorder: { total: "747" },
  createdAt: new Date("2026-09-26T10:00:00.000Z"),
  ...overrides,
});

describe("GET /api/admin/notifications", () => {
  it("scopes a plain admin to their assigned restaurants and flags bookings newer than seenAt as unread", async () => {
    prisma.adminUser.findUniqueOrThrow.mockResolvedValue({ notificationsSeenAt: new Date("2026-09-26T09:00:00.000Z") });
    prisma.adminRestaurant.findMany.mockResolvedValue([{ restaurantId: "r1" }]);
    prisma.restaurantBooking.findMany.mockResolvedValue([
      booking(),
      booking({ id: "booking-0", createdAt: new Date("2026-09-26T08:00:00.000Z") }),
    ]);
    prisma.restaurantBooking.count.mockResolvedValue(1);

    const res = await asAdmin("ADMIN", "get", "/api/admin/notifications");

    expect(res.status).toBe(200);
    expect(res.body.data.unreadCount).toBe(1);
    expect(res.body.data.items.map((item: any) => item.unread)).toEqual([true, false]);
    expect(res.body.data.items[0]).toMatchObject({ bookingId: "booking-1", restaurantName: "Bites & Brews Cafe", time: "7:30 PM", amount: 747 });
    expect(prisma.restaurantBooking.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { restaurantId: { in: ["r1"] } }, orderBy: { createdAt: "desc" } }));
  });

  it("does not scope a SuperAdmin to specific restaurants", async () => {
    prisma.adminUser.findUniqueOrThrow.mockResolvedValue({ notificationsSeenAt: new Date() });
    prisma.restaurantBooking.findMany.mockResolvedValue([]);
    prisma.restaurantBooking.count.mockResolvedValue(0);

    const res = await asAdmin("SUPERADMIN", "get", "/api/admin/notifications");

    expect(res.status).toBe(200);
    expect(prisma.adminRestaurant.findMany).not.toHaveBeenCalled();
    expect(prisma.restaurantBooking.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
  });

  it("starts the seen clock on first use instead of marking every old booking unread", async () => {
    prisma.adminUser.findUniqueOrThrow.mockResolvedValue({ notificationsSeenAt: null });
    prisma.restaurantBooking.findMany.mockResolvedValue([booking()]);
    prisma.restaurantBooking.count.mockResolvedValue(0);

    const res = await asAdmin("SUPERADMIN", "get", "/api/admin/notifications");

    expect(res.status).toBe(200);
    expect(prisma.adminUser.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "admin-1" }, data: { notificationsSeenAt: expect.any(Date) } }));
    expect(res.body.data.items[0].unread).toBe(false);
  });
});

describe("POST /api/admin/notifications/seen", () => {
  it("moves the admin's seen clock to now", async () => {
    prisma.adminUser.update.mockResolvedValue({});
    const res = await asAdmin("ADMIN", "post", "/api/admin/notifications/seen");
    expect(res.status).toBe(200);
    expect(res.body.data.unreadCount).toBe(0);
    expect(prisma.adminUser.update).toHaveBeenCalledWith({ where: { id: "admin-1" }, data: { notificationsSeenAt: expect.any(Date) } });
  });
});
