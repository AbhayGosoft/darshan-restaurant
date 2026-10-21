import { Router } from "express";
import { z } from "zod";
import { requireCustomerAuth } from "../../middleware/auth.js";
import { listMyBookings } from "../../services/bookingService.js";
import { asyncHandler, sendSuccess, validateQuery } from "../../utils/http.js";

const router = Router();
router.use(requireCustomerAuth);

// "active" = still in progress, "past" = completed/cancelled/rejected; "upcoming" is kept as an alias of "active".
const querySchema = z.object({ filter: z.enum(["active", "upcoming", "past"]).optional() });

// OpenAPI docs: src/docs/user/myBookings.docs.ts
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const query = validateQuery(querySchema, req.query);
    // req.user's identity comes only from the verified JWT — never from a client-supplied id.
    const bookings = await listMyBookings(req.customer!.id, query.filter, req.lang);
    sendSuccess(res, bookings);
  }),
);

export default router;
