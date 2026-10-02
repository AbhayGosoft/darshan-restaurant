/**
 * @openapi
 * /api/admin/notifications:
 *   get:
 *     tags: ["Admin: Notifications"]
 *     summary: Latest bookings for the header bell, with the unread count
 *     description: Scoped to the admin's assigned restaurants (SuperAdmin sees all). A booking is unread when it was created after the admin last called POST /api/admin/notifications/seen. The first call starts that clock, so existing bookings are not counted as unread.
 *     security:
 *       - ClientKey: []
 *       - AdminBearer: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 50, default: 20 }
 *     responses:
 *       200:
 *         description: "data = { unreadCount, seenAt, items: [{ bookingId, humanBookingId, restaurantId, restaurantName, restaurantImage, fullName, people, date, time, amount, status, createdAt, unread }] }, newest first"
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/SuccessEnvelope" }
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 */

/**
 * @openapi
 * /api/admin/notifications/seen:
 *   post:
 *     tags: ["Admin: Notifications"]
 *     summary: Mark every notification up to now as seen (resets the unread count to 0)
 *     security:
 *       - ClientKey: []
 *       - AdminBearer: []
 *     responses:
 *       200:
 *         description: Marked as seen
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/SuccessEnvelope" }
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 */
export {};
