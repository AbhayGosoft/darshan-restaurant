import type { BookingStatus } from "../../generated/prisma/enums.js";

/** Lowercase status names used on the API surface ("upcoming", "acknowledged", ...). */
export type BookingClientStatus = Lowercase<BookingStatus>;

/** Orders the restaurant still has to act on. */
export const ACTIVE_BOOKING_STATUSES: BookingStatus[] = ["UPCOMING", "ACKNOWLEDGED", "PREPARING", "READY"];
export const CLOSED_BOOKING_STATUSES: BookingStatus[] = ["COMPLETED", "CANCELLED", "REJECTED"];

/** The only forward moves the restaurant can make: one step at a time. */
export const NEXT_BOOKING_STATUS: Partial<Record<BookingStatus, BookingStatus>> = {
  UPCOMING: "ACKNOWLEDGED",
  ACKNOWLEDGED: "PREPARING",
  PREPARING: "READY",
  READY: "COMPLETED",
};

/** A customer may cancel only until the kitchen starts preparing the food. */
export const CUSTOMER_CANCELLABLE_STATUSES: BookingStatus[] = ["UPCOMING", "ACKNOWLEDGED"];
/** The restaurant may cancel any order that isn't finished yet. */
export const RESTAURANT_CANCELLABLE_STATUSES: BookingStatus[] = ACTIVE_BOOKING_STATUSES;
/** Rejecting means declining the order, so it is only possible before it was acknowledged. */
export const REJECTABLE_STATUSES: BookingStatus[] = ["UPCOMING"];
/** Arrival time / party size can change until the restaurant acknowledges the order. */
export const CUSTOMER_MODIFIABLE_STATUSES: BookingStatus[] = ["UPCOMING"];

export const toClientStatus = (status: BookingStatus) => status.toLowerCase() as BookingClientStatus;
export const fromClientStatus = (status: BookingClientStatus) => status.toUpperCase() as BookingStatus;
