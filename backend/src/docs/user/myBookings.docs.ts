/**
 * @openapi
 * /api/my-restaurant-bookings:
 *   get:
 *     tags: ["User: Bookings"]
 *     summary: List the signed-in customer's bookings
 *     security:
 *       - ClientKey: []
 *       - CustomerBearer: []
 *     parameters:
 *       - in: query
 *         name: filter
 *         description: active = upcoming/acknowledged/preparing/ready; past = completed/cancelled/rejected ("upcoming" is an alias of active)
 *         schema: { type: string, enum: [active, upcoming, past] }
 *     responses:
 *       200:
 *         description: Bookings
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/SuccessEnvelope" }
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 */
export {};
