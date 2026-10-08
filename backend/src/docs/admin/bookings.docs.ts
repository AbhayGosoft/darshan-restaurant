/**
 * @openapi
 * /api/admin/bookings:
 *   get:
 *     tags: ["Admin: Bookings"]
 *     summary: List bookings (scoped to the admin's assigned restaurants; SuperAdmin sees all)
 *     security:
 *       - ClientKey: []
 *       - AdminBearer: []
 *     parameters:
 *       - in: query
 *         name: restaurantId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: status
 *         description: A single status, or "active" for every order still in progress
 *         schema: { type: string, enum: [active, upcoming, acknowledged, preparing, ready, completed, cancelled, rejected] }
 *       - in: query
 *         name: from
 *         description: Earliest arrival date, inclusive
 *         schema: { type: string, format: date, example: "2026-10-02" }
 *       - in: query
 *         name: to
 *         description: Latest arrival date, inclusive
 *         schema: { type: string, format: date, example: "2026-10-09" }
 *       - in: query
 *         name: search
 *         description: Matches guest name, mobile number or booking ID
 *         schema: { type: string }
 *       - in: query
 *         name: sort
 *         description: By arrival date and time; asc = soonest first, desc = latest first
 *         schema: { type: string, enum: [asc, desc], default: desc }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated bookings
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: "#/components/schemas/SuccessEnvelope"
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         bookings: { type: array, items: { type: object } }
 *                         pagination: { $ref: "#/components/schemas/Pagination" }
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 *       403:
 *         $ref: "#/components/responses/Forbidden"
 *       422:
 *         $ref: "#/components/responses/ValidationError"
 */

/**
 * @openapi
 * /api/admin/bookings/{id}:
 *   get:
 *     tags: ["Admin: Bookings"]
 *     summary: Get a booking by id (must be an assigned restaurant, unless SuperAdmin)
 *     security:
 *       - ClientKey: []
 *       - AdminBearer: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Booking
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/SuccessEnvelope" }
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 *       403:
 *         $ref: "#/components/responses/Forbidden"
 *       404:
 *         $ref: "#/components/responses/NotFound"
 */

/**
 * @openapi
 * /api/admin/bookings/{id}/cancel:
 *   post:
 *     tags: ["Admin: Bookings"]
 *     summary: Cancel an order at any point before it is completed (must be an assigned restaurant, unless SuperAdmin)
 *     security:
 *       - ClientKey: []
 *       - AdminBearer: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason: { type: string, default: Other, description: "One of the configured cancellation reason labels" }
 *     responses:
 *       200:
 *         description: Booking cancelled
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/SuccessEnvelope" }
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 *       403:
 *         $ref: "#/components/responses/Forbidden"
 *       404:
 *         $ref: "#/components/responses/NotFound"
 *       422:
 *         $ref: "#/components/responses/ValidationError"
 */
/**
 * @openapi
 * /api/admin/bookings/{id}/status:
 *   post:
 *     tags: ["Admin: Bookings"]
 *     summary: Move an order one step forward (upcoming → acknowledged → preparing → ready → completed)
 *     description: "`status` must be the next step of the order's current status; anything else is a 409."
 *     security:
 *       - ClientKey: []
 *       - AdminBearer: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [acknowledged, preparing, ready, completed] }
 *     responses:
 *       200:
 *         description: Order status updated
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/SuccessEnvelope" }
 *       403:
 *         $ref: "#/components/responses/Forbidden"
 *       404:
 *         $ref: "#/components/responses/NotFound"
 *       409:
 *         description: The order is not in the status right before the requested one
 */

/**
 * @openapi
 * /api/admin/bookings/{id}/reject:
 *   post:
 *     tags: ["Admin: Bookings"]
 *     summary: Reject a new order (only while "upcoming"); the amount paid becomes refundable
 *     security:
 *       - ClientKey: []
 *       - AdminBearer: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason: { type: string, maxLength: 500 }
 *     responses:
 *       200:
 *         description: Order rejected
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/SuccessEnvelope" }
 *       403:
 *         $ref: "#/components/responses/Forbidden"
 *       404:
 *         $ref: "#/components/responses/NotFound"
 *       409:
 *         description: The order was already acknowledged (cancel it instead) or is closed
 */
export {};
