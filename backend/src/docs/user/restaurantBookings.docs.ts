/**
 * @openapi
 * /api/restaurant-bookings/{id}:
 *   get:
 *     tags: ["User: Bookings"]
 *     summary: Get one of the signed-in customer's bookings by id
 *     security:
 *       - ClientKey: []
 *       - CustomerBearer: []
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
 *       404:
 *         $ref: "#/components/responses/NotFound"
 */

/**
 * @openapi
 * /api/restaurant-bookings/{id}:
 *   patch:
 *     tags: ["User: Bookings"]
 *     summary: Change arrival time / party size (only while the order is still "upcoming")
 *     security:
 *       - ClientKey: []
 *       - CustomerBearer: []
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
 *             description: At least one of time, people is required
 *             properties:
 *               date: { type: string, example: "2026-10-03", description: "Optional — must be today if sent" }
 *               time: { type: string, example: "2:00 PM", description: "New arrival time" }
 *               people: { type: integer, minimum: 1 }
 *     responses:
 *       200:
 *         description: Booking updated
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/SuccessEnvelope" }
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 *       404:
 *         $ref: "#/components/responses/NotFound"
 *       422:
 *         $ref: "#/components/responses/ValidationError"
 */

/**
 * @openapi
 * /api/restaurant-bookings/{id}/cancel:
 *   post:
 *     tags: ["User: Bookings"]
 *     summary: Cancel an order (only while "upcoming" or "acknowledged" — not once preparation started)
 *     security:
 *       - ClientKey: []
 *       - CustomerBearer: []
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
 *             required: [reason]
 *             properties:
 *               reason: { type: string, description: "One of the configured cancellation reason labels" }
 *     responses:
 *       200:
 *         description: Booking cancelled
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/SuccessEnvelope" }
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 *       404:
 *         $ref: "#/components/responses/NotFound"
 *       422:
 *         $ref: "#/components/responses/ValidationError"
 */
export {};
