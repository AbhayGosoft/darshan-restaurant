import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { requireAdminAuth } from "../../middleware/auth.js";
import { resolveAssetUrl } from "../../utils/images.js";
import { formatDateOnly } from "../../utils/dates.js";
import { to12Hour } from "../../utils/slotTime.js";
import { asyncHandler, sendSuccess, validateQuery } from "../../utils/http.js";

// New-booking feed for the admin panel's header bell. Scoped like the bookings list: a plain
// Admin sees bookings of their assigned restaurants, a SuperAdmin sees every restaurant.
// "Unread" = created after the admin last opened the panel (AdminUser.notificationsSeenAt).
// OpenAPI docs: src/docs/admin/notifications.docs.ts
const router = Router();
router.use(requireAdminAuth);

const restaurantScope = async (adminId: string, role: string) => {
  if (role === "SUPERADMIN") return {};
  const links = await prisma.adminRestaurant.findMany({ where: { adminId }, select: { restaurantId: true } });
  return { restaurantId: { in: links.map((link) => link.restaurantId) } };
};

const listQuerySchema = z.object({ limit: z.coerce.number().int().min(1).max(50).default(20) });

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { limit } = validateQuery(listQuerySchema, req.query);
    const admin = await prisma.adminUser.findUniqueOrThrow({ where: { id: req.admin!.id }, select: { notificationsSeenAt: true } });

    // First use: start the clock now instead of flagging every historical booking as unread.
    let seenAt = admin.notificationsSeenAt;
    if (!seenAt) {
      seenAt = new Date();
      await prisma.adminUser.update({ where: { id: req.admin!.id }, data: { notificationsSeenAt: seenAt } });
    }

    const scope = await restaurantScope(req.admin!.id, req.admin!.role);
    const [bookings, unreadCount] = await Promise.all([
      prisma.restaurantBooking.findMany({
        where: scope,
        orderBy: { createdAt: "desc" },
        take: limit,
        include: { preorder: { select: { total: true } } },
      }),
      prisma.restaurantBooking.count({ where: { ...scope, createdAt: { gt: seenAt } } }),
    ]);

    sendSuccess(res, {
      unreadCount,
      seenAt,
      items: bookings.map((booking) => ({
        bookingId: booking.id,
        humanBookingId: booking.humanBookingId,
        restaurantId: booking.restaurantId,
        restaurantName: booking.restaurantNameSnapshot,
        restaurantImage: resolveAssetUrl(booking.restaurantImageSnapshot ?? undefined) ?? null,
        fullName: booking.fullName,
        people: booking.people,
        date: formatDateOnly(booking.date),
        time: to12Hour(booking.time),
        amount: Number(booking.preorder?.total ?? booking.advancePaid),
        status: booking.status === "CANCELLED" ? "cancelled" : "upcoming",
        createdAt: booking.createdAt,
        unread: booking.createdAt > seenAt,
      })),
    });
  }),
);

// Called when the admin opens the panel: everything up to now becomes read.
router.post(
  "/seen",
  asyncHandler(async (req, res) => {
    const seenAt = new Date();
    await prisma.adminUser.update({ where: { id: req.admin!.id }, data: { notificationsSeenAt: seenAt } });
    sendSuccess(res, { unreadCount: 0, seenAt }, "Notifications marked as seen");
  }),
);

export default router;
