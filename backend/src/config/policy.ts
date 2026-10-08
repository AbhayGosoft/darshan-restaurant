import { env } from "./env.js";

/**
 * Centralized, explicit business rules the spec left for the backend to decide.
 * Keep every modification/cancellation/refund decision routed through this file
 * instead of scattering magic numbers across controllers.
 */
export const policy = {
  /** Minutes before the arrival time to fire the reminder push (skipped when that moment has already passed). */
  reminderMinutesBefore: env.bookingReminderMinutesBefore,
  /** Fixed advance amount (INR) charged for every restaurant booking. */
  bookingAdvanceInr: env.restaurantBookingAdvanceInr,
  /** Arrival-time picker granularity: the earliest arrival is rounded up to this, and suggested times step by it. */
  arrivalStepMinutes: 15,
  /** Extra minutes a paid booking may still be confirmed after its arrival time became too soon, so a
   * customer whose payment finished just after the cutoff isn't charged without a booking. */
  paidBookingGraceMinutes: 5,
  /** IANA timezone arrival times and opening hours are expressed in (restaurant wall-clock time). */
  businessTimeZone: env.businessTimeZone,
};

export type RefundDecision = { eligible: boolean; amount: number };

/**
 * Refund policy: a customer can only cancel before the food goes into preparation, and the
 * restaurant cancelling or rejecting is never the customer's fault — so every cancellation or
 * rejection makes the full amount paid refundable. Change it here only.
 */
export const decideRefund = (input: { advancePaid: number }): RefundDecision => ({ eligible: true, amount: input.advancePaid });
