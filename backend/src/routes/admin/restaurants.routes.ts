import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { requireAdminAuth, requireRestaurantAccess, requireSuperAdmin } from "../../middleware/auth.js";
import { imageUrlSchema, resolveAssetUrl } from "../../utils/images.js";
import { ApiError, asyncHandler, idParam, sendSuccess, validateBody, validateQuery } from "../../utils/http.js";
import { pagination } from "../../utils/query.js";
import { isValidTime24, toMinutes } from "../../utils/slotTime.js";
import { RESTAURANT_TRANSLATABLE_FIELDS, translationsForAdmin, translationsInputSchema } from "../../i18n/translations.js";

// OpenAPI docs: src/docs/admin/restaurants.docs.ts
const router = Router();
router.use(requireAdminAuth);

const restaurantInclude = { categories: { include: { category: true } } } as const;

const toAdminRestaurant = (restaurant: any) => ({
  id: restaurant.id,
  name: restaurant.name,
  banner: resolveAssetUrl(restaurant.banner ?? undefined) ?? null,
  gallery: ((restaurant.gallery as string[] | null) ?? []).map((url: string) => resolveAssetUrl(url)),
  categories: restaurant.categories.map((link: any) => link.category.key),
  cuisineLabel: restaurant.cuisineLabel,
  isPureVeg: restaurant.isPureVeg,
  rating: Number(restaurant.rating),
  ratingCount: restaurant.ratingCount,
  prepTimeMin: restaurant.prepTimeMin,
  prepTimeMax: restaurant.prepTimeMax,
  priceForTwo: restaurant.priceForTwo,
  offerText: restaurant.offerText,
  offerSubText: restaurant.offerSubText,
  about: restaurant.about,
  addressLine: restaurant.addressLine,
  city: restaurant.city,
  state: restaurant.state,
  country: restaurant.country,
  pincode: restaurant.pincode,
  phone: restaurant.phone,
  latitude: Number(restaurant.latitude),
  longitude: Number(restaurant.longitude),
  seatingCapacity: restaurant.seatingCapacity,
  maxPartySize: restaurant.maxPartySize,
  opensAt: restaurant.opensAt,
  closesAt: restaurant.closesAt,
  translations: translationsForAdmin(restaurant.translations),
  status: restaurant.status,
  createdAt: restaurant.createdAt,
});

const listQuerySchema = z.object({
  search: z.string().trim().optional(),
  adminId: z.string().uuid().optional(),
  // Lets the UI show active and deactivated restaurants as separate lists.
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  // Capped at 500 rather than 100 because AdminsPage fetches up to 200 in one shot to
  // populate the "assigned restaurants" checkbox list, not just to paginate a table.
  limit: z.coerce.number().int().min(1).max(500).default(20),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const query = validateQuery(listQuerySchema, req.query);
    // A plain Admin is always scoped to their own assignments. Only a SuperAdmin may look
    // up another admin's restaurants via ?adminId= (e.g. drilling into a specific admin
    // from the SuperAdmin admin-picker flow) — a non-SuperAdmin passing it is just ignored.
    const scopedWhere =
      req.admin!.role === "SUPERADMIN"
        ? query.adminId
          ? { admins: { some: { adminId: query.adminId } } }
          : {}
        : { admins: { some: { adminId: req.admin!.id } } };
    const where = {
      ...scopedWhere,
      ...(query.status ? { status: query.status } : {}),
      ...(query.search ? { OR: [{ name: { contains: query.search } }, { city: { contains: query.search } }] } : {}),
    };

    const [restaurants, total] = await Promise.all([
      prisma.restaurant.findMany({
        where,
        include: restaurantInclude,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.restaurant.count({ where }),
    ]);

    sendSuccess(res, { restaurants: restaurants.map(toAdminRestaurant), pagination: pagination(query.page, query.limit, total) });
  }),
);

const createSchema = z.object({
  name: z.string().trim().min(1),
  banner: imageUrlSchema.optional(),
  gallery: z.array(imageUrlSchema).default([]),
  categoryIds: z.array(z.string().uuid()).default([]),
  // Only honored when the requester is a SUPERADMIN browsing a specific admin's scoped
  // restaurant list — lets "Add restaurant" from that view assign it to that admin instead
  // of creating an orphaned restaurant nobody but an unscoped SuperAdmin can see.
  adminId: z.string().uuid().optional(),
  cuisineLabel: z.string().trim().min(1),
  isPureVeg: z.boolean().default(false),
  prepTimeMin: z.coerce.number().int().min(0),
  prepTimeMax: z.coerce.number().int().min(0),
  priceForTwo: z.coerce.number().int().min(0),
  offerText: z.string().trim().optional(),
  offerSubText: z.string().trim().optional(),
  about: z.string().trim().optional(),
  addressLine: z.string().trim().min(1),
  city: z.string().trim().min(1),
  state: z.string().trim().optional(),
  country: z.string().trim().default("India"),
  pincode: z.string().trim().optional(),
  phone: z.string().trim().min(6),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  seatingCapacity: z.coerce.number().int().min(1).default(40),
  maxPartySize: z.coerce.number().int().min(1).default(12),
  /** Daily opening hours, 24h "HH:mm"; customers can only pick arrival times inside them. */
  opensAt: z.string().refine(isValidTime24, { message: 'opensAt must look like "09:00"' }).optional(),
  closesAt: z.string().refine(isValidTime24, { message: 'closesAt must look like "23:00"' }).optional(),
  /** Other-language copies of the text fields: { "hi": { "name": "...", "about": "..." } }. Replaces the stored set on update. */
  translations: translationsInputSchema(RESTAURANT_TRANSLATABLE_FIELDS).optional(),
});

const assertOpeningHours = (opensAt: string, closesAt: string) => {
  if (toMinutes(closesAt) <= toMinutes(opensAt)) throw new ApiError(422, "Closing time must be after opening time.");
};

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = validateBody(createSchema, req.body);
    // Unset hours fall back to the column defaults (09:00–23:00).
    assertOpeningHours(body.opensAt ?? "09:00", body.closesAt ?? "23:00");
    const { categoryIds, adminId, ...rest } = body;

    const assignedAdminIds =
      req.admin!.role === "ADMIN"
        ? [req.admin!.id]
        : adminId
          ? [adminId]
          : [];

    const restaurant = await prisma.restaurant.create({
      data: {
        ...rest,
        categories: { create: categoryIds.map((categoryId) => ({ categoryId })) },
        ...(assignedAdminIds.length ? { admins: { create: assignedAdminIds.map((id) => ({ adminId: id })) } } : {}),
      },
      include: restaurantInclude,
    });
    sendSuccess(res, toAdminRestaurant(restaurant), "Restaurant created", 201);
  }),
);

router.get(
  "/:id",
  requireRestaurantAccess("id"),
  asyncHandler(async (req, res) => {
    const id = idParam(req);
    const restaurant = await prisma.restaurant.findUnique({ where: { id }, include: restaurantInclude });
    if (!restaurant) throw new ApiError(404, "Restaurant not found");
    sendSuccess(res, toAdminRestaurant(restaurant));
  }),
);

// status lets a deactivated restaurant be switched back to ACTIVE from the admin UI.
const updateSchema = createSchema.partial().extend({ status: z.enum(["ACTIVE", "INACTIVE"]).optional() });

router.patch(
  "/:id",
  requireRestaurantAccess("id"),
  asyncHandler(async (req, res) => {
    const id = idParam(req);
    const body = validateBody(updateSchema, req.body);
    if (body.opensAt || body.closesAt) {
      const current = await prisma.restaurant.findUnique({ where: { id }, select: { opensAt: true, closesAt: true } });
      if (!current) throw new ApiError(404, "Restaurant not found");
      assertOpeningHours(body.opensAt ?? current.opensAt, body.closesAt ?? current.closesAt);
    }
    const { categoryIds, ...rest } = body;

    if (categoryIds) {
      await prisma.restaurantCategoryLink.deleteMany({ where: { restaurantId: id } });
    }

    const restaurant = await prisma.restaurant.update({
      where: { id },
      data: {
        ...rest,
        ...(categoryIds ? { categories: { create: categoryIds.map((categoryId) => ({ categoryId })) } } : {}),
      },
      include: restaurantInclude,
    });
    sendSuccess(res, toAdminRestaurant(restaurant), "Restaurant updated");
  }),
);

// Rating/ratingCount are never part of the general update — bumping a restaurant's public
// rating is an explicit, SuperAdmin-only action per spec.
router.patch(
  "/:id/rating",
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const id = idParam(req);
    const body = validateBody(z.object({ rating: z.coerce.number().min(0).max(5), ratingCount: z.coerce.number().int().min(0) }), req.body);
    const restaurant = await prisma.restaurant.update({ where: { id }, data: body, include: restaurantInclude });
    sendSuccess(res, toAdminRestaurant(restaurant), "Rating updated");
  }),
);

router.delete(
  "/:id",
  requireRestaurantAccess("id"),
  asyncHandler(async (req, res) => {
    const id = idParam(req);
    await prisma.restaurant.update({ where: { id }, data: { status: "INACTIVE" } });
    sendSuccess(res, {}, "Restaurant deactivated");
  }),
);

// Hard delete (SuperAdmin only). A restaurant with any bookings is deactivated instead so
// booking/payment history stays intact; otherwise menus, tables and links cascade away.
router.delete(
  "/:id/permanent",
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const id = idParam(req);
    const restaurant = await prisma.restaurant.findUnique({ where: { id } });
    if (!restaurant) throw new ApiError(404, "Restaurant not found");
    const bookings = await prisma.restaurantBooking.count({ where: { restaurantId: id } });
    if (bookings > 0) {
      await prisma.restaurant.update({ where: { id }, data: { status: "INACTIVE" } });
      sendSuccess(res, { deleted: false, deactivated: true }, "This restaurant has bookings, so it was deactivated instead");
      return;
    }
    await prisma.restaurant.delete({ where: { id } });
    sendSuccess(res, { deleted: true, deactivated: false }, "Restaurant deleted permanently");
  }),
);

export default router;
