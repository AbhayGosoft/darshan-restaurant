/**
 * @openapi
 * /api/restaurants:
 *   get:
 *     tags: ["User: Restaurants"]
 *     summary: List/search restaurants
 *     security:
 *       - ClientKey: []
 *     parameters:
 *       - in: query
 *         name: city
 *         schema: { type: string }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Free-text search
 *       - in: query
 *         name: latitude
 *         schema: { type: number }
 *       - in: query
 *         name: longitude
 *         schema: { type: number }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated restaurant list
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
 *                         restaurants: { type: array, items: { type: object } }
 *                         pagination: { $ref: "#/components/schemas/Pagination" }
 *       422:
 *         $ref: "#/components/responses/ValidationError"
 */

/**
 * @openapi
 * /api/restaurants/{id}:
 *   get:
 *     tags: ["User: Restaurants"]
 *     summary: Get restaurant detail
 *     security:
 *       - ClientKey: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: latitude
 *         schema: { type: number }
 *       - in: query
 *         name: longitude
 *         schema: { type: number }
 *     responses:
 *       200:
 *         description: Restaurant detail
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/SuccessEnvelope" }
 *       404:
 *         $ref: "#/components/responses/NotFound"
 *       422:
 *         $ref: "#/components/responses/ValidationError"
 */

/**
 * @openapi
 * /api/restaurants/{id}/menu:
 *   get:
 *     tags: ["User: Menu"]
 *     summary: Get a restaurant's menu
 *     security:
 *       - ClientKey: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Menu categories and items
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/SuccessEnvelope" }
 *       404:
 *         $ref: "#/components/responses/NotFound"
 */

/**
 * @openapi
 * /api/restaurants/{id}/arrival-window:
 *   get:
 *     tags: ["User: Arrival"]
 *     summary: Today's allowed arrival times (orders are same-day only)
 *     description: >
 *       Earliest arrival = now + the restaurant's max prep time, rounded up to `stepMinutes` and never before
 *       opening; latest = closing time. When `isOpen` is false the restaurant takes no more orders today.
 *       `suggestedTimes` lists every step in between, ready for a time picker.
 *     security:
 *       - ClientKey: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Arrival window
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
 *                         date: { type: string, example: "2026-10-03" }
 *                         isOpen: { type: boolean }
 *                         opensAt: { type: string, example: "9:00 AM" }
 *                         closesAt: { type: string, example: "11:00 PM" }
 *                         prepTimeMinutes: { type: integer, example: 30 }
 *                         earliest: { type: string, nullable: true, example: "12:45 PM" }
 *                         latest: { type: string, nullable: true, example: "11:00 PM" }
 *                         stepMinutes: { type: integer, example: 15 }
 *                         suggestedTimes: { type: array, items: { type: string }, example: ["12:45 PM", "1:00 PM", "1:15 PM"] }
 *       404:
 *         $ref: "#/components/responses/NotFound"
 */

// Table booking disabled — GET /api/restaurants/{id}/tables/availability is turned off for now.

/**
 * @openapi
 * /api/restaurants/{id}/bookings:
 *   post:
 *     tags: ["User: Bookings"]
 *     summary: Place a same-day food order with an arrival time (after payment order creation)
 *     description: >
 *       The order starts as `upcoming`. `time` is the arrival time and must be inside today's arrival window
 *       (see /arrival-window); a 5-minute grace applies because the order is already paid.
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
 *             required: [time, people, fullName, mobileNumber, preorderItems, payment]
 *             properties:
 *               date: { type: string, example: "2026-10-03", description: "Optional — must be today if sent" }
 *               time: { type: string, example: "1:30 PM", description: "Arrival time" }
 *               people: { type: integer, minimum: 1 }
 *               tablePreference: { type: string, description: "Deprecated (table booking disabled). Optional, defaults to Any Table." }
 *               specialRequest: { type: string, maxLength: 500 }
 *               fullName: { type: string }
 *               mobileNumber: { type: string }
 *               email: { type: string, format: email }
 *               latitude: { type: number }
 *               longitude: { type: number }
 *               preorderItems:
 *                 type: array
 *                 minItems: 1
 *                 description: Must be the same items (same total) used for /api/payments/initiate.
 *                 items:
 *                   type: object
 *                   required: [menuItemId, quantity]
 *                   properties:
 *                     menuItemId: { type: string, format: uuid }
 *                     quantity: { type: integer, minimum: 1 }
 *                     note: { type: string }
 *               payment:
 *                 type: object
 *                 required: [razorpay_order_id, razorpay_payment_id]
 *                 properties:
 *                   razorpay_order_id: { type: string }
 *                   razorpay_payment_id: { type: string }
 *     responses:
 *       201:
 *         description: Order placed (status "upcoming")
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
