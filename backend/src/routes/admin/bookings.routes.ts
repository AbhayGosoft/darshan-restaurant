import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { requireAdminAuth } from "../../middleware/auth.js";
import { adminCancelBooking, advanceBookingStatus, getBookingForAdmin, listBookingsForAdmin, rejectBooking } from "../../services/bookingService.js";
import { CANCELLATION_REASON_LABELS } from "../../constants/bookingOptions.js";
import { fromClientStatus } from "../../constants/bookingStatus.js";
import { ApiError, asyncHandler, idParam, sendSuccess, validateBody, validateQuery } from "../../utils/http.js";
import { pagination } from "../../utils/query.js";

const router = Router();
router.use(requireAdminAuth);

const assertRestaurantAccess = async (adminId: string, role: string, restaurantId: string) => {
  if (role === "SUPERADMIN") return;
  const link = await prisma.adminRestaurant.findUnique({ where: { adminId_restaurantId: { adminId, restaurantId } } });
  if (!link) throw new ApiError(403, "You are not authorized to manage this restaurant");
};

const listQuerySchema = z.object({
  restaurantId: z.string().uuid().optional(),
  // A single status, or "active" for every order still in progress (upcoming → ready).
  status: z.enum(["active", "upcoming", "acknowledged", "preparing", "ready", "completed", "cancelled", "rejected"]).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "from must be YYYY-MM-DD").optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "to must be YYYY-MM-DD").optional(),
  search: z.string().trim().max(100).optional(),
  sort: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// OpenAPI docs: src/docs/admin/bookings.docs.ts
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const query = validateQuery(listQuerySchema, req.query);
    if (query.restaurantId) await assertRestaurantAccess(req.admin!.id, req.admin!.role, query.restaurantId);

    let restaurantIds: string[] | undefined;
    if (!query.restaurantId && req.admin!.role !== "SUPERADMIN") {
      const links = await prisma.adminRestaurant.findMany({ where: { adminId: req.admin!.id }, select: { restaurantId: true } });
      restaurantIds = links.map((link) => link.restaurantId);
    }

    const result = await listBookingsForAdmin({
      restaurantId: query.restaurantId,
      restaurantIds,
      status: query.status,
      from: query.from,
      to: query.to,
      search: query.search,
      sort: query.sort,
      page: query.page,
      limit: query.limit,
    });
    sendSuccess(res, { bookings: result.bookings, pagination: pagination(query.page, query.limit, result.total) });
  }),
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = idParam(req);
    const { booking, restaurantId } = await getBookingForAdmin(id);
    await assertRestaurantAccess(req.admin!.id, req.admin!.role, restaurantId);
    sendSuccess(res, booking);
  }),
);

const cancelSchema = z.object({ reason: z.enum(Object.values(CANCELLATION_REASON_LABELS) as [string, ...string[]]).default("Other") });

router.post(
  "/:id/cancel",
  asyncHandler(async (req, res) => {
    const id = idParam(req);
    const { restaurantId } = await getBookingForAdmin(id);
    await assertRestaurantAccess(req.admin!.id, req.admin!.role, restaurantId);
    const body = validateBody(cancelSchema, req.body);
    const result = await adminCancelBooking(id, body.reason);
    sendSuccess(res, result, "Booking cancelled");
  }),
);

// Moves an order one step forward. `status` must be the next step of the order's current status.
const statusSchema = z.object({ status: z.enum(["acknowledged", "preparing", "ready", "completed"]) });

router.post(
  "/:id/status",
  asyncHandler(async (req, res) => {
    const id = idParam(req);
    const { restaurantId } = await getBookingForAdmin(id);
    await assertRestaurantAccess(req.admin!.id, req.admin!.role, restaurantId);
    const body = validateBody(statusSchema, req.body);
    const result = await advanceBookingStatus(id, fromClientStatus(body.status));
    sendSuccess(res, result, "Order status updated");
  }),
);

const rejectSchema = z.object({ reason: z.string().trim().max(500).optional() });

// Declines a new (not yet acknowledged) order.
router.post(
  "/:id/reject",
  asyncHandler(async (req, res) => {
    const id = idParam(req);
    const { restaurantId } = await getBookingForAdmin(id);
    await assertRestaurantAccess(req.admin!.id, req.admin!.role, restaurantId);
    const body = validateBody(rejectSchema, req.body);
    const result = await rejectBooking(id, body.reason);
    sendSuccess(res, result, "Order rejected");
  }),
);

export default router;
