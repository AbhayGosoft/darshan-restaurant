import type { Restaurant } from "../../generated/prisma/client.js";
import { policy } from "../config/policy.js";
import { ApiError } from "../utils/http.js";
import { businessNow, combineDateAndTime, formatDateOnly } from "../utils/dates.js";
import { fromMinutes, to12Hour, toMinutes } from "../utils/slotTime.js";
import { getActiveRestaurantOrThrow } from "./restaurantService.js";

type ArrivalRestaurant = Pick<Restaurant, "opensAt" | "closesAt" | "prepTimeMax">;

const ceilTo = (value: number, step: number) => Math.ceil(value / step) * step;

/** Earliest arrival (minutes since midnight, business timezone) that still leaves the kitchen the
 * restaurant's full prep time — `now + prepTimeMax`, minus an optional grace for already-paid orders. */
const earliestArrivalMinutes = (restaurant: ArrivalRestaurant, now: Date, graceMinutes = 0) => {
  const { time } = businessNow(now);
  // businessNow() drops seconds; round the current minute up so "now" is never under-counted.
  const nowMinutes = toMinutes(time) + (now.getUTCSeconds() > 0 || now.getUTCMilliseconds() > 0 ? 1 : 0);
  return nowMinutes + restaurant.prepTimeMax - graceMinutes;
};

/**
 * Today's arrival-time window for a restaurant. Orders are same-day only: the customer may arrive
 * from `now + prepTimeMax` (rounded up to the picker step, and never before opening) until closing.
 * `isOpen` is false once that window is empty (e.g. late evening, or prep time runs past closing).
 */
export const computeArrivalWindow = (restaurant: ArrivalRestaurant, now = new Date()) => {
  const step = policy.arrivalStepMinutes;
  const opens = toMinutes(restaurant.opensAt);
  const closes = toMinutes(restaurant.closesAt);
  const earliest = Math.max(opens, ceilTo(earliestArrivalMinutes(restaurant, now), step));
  const isOpen = earliest <= closes;

  const suggested: string[] = [];
  if (isOpen) for (let minutes = earliest; minutes <= closes; minutes += step) suggested.push(to12Hour(fromMinutes(minutes)));

  return {
    date: formatDateOnly(businessNow(now).date),
    isOpen,
    opensAt: to12Hour(restaurant.opensAt),
    closesAt: to12Hour(restaurant.closesAt),
    prepTimeMinutes: restaurant.prepTimeMax,
    earliest: isOpen ? to12Hour(fromMinutes(earliest)) : null,
    latest: isOpen ? to12Hour(restaurant.closesAt) : null,
    stepMinutes: step,
    suggestedTimes: suggested,
  };
};

export const getArrivalWindow = async (restaurantId: string) => computeArrivalWindow(await getActiveRestaurantOrThrow(restaurantId));

/**
 * Validates a same-day arrival time ("HH:mm") and returns today's business date it belongs to.
 * `graceMinutes` loosens only the prep-time lead, for orders that are already paid.
 */
export const assertArrivalTime = (restaurant: ArrivalRestaurant, time24: string, options: { graceMinutes?: number; now?: Date } = {}) => {
  const now = options.now ?? new Date();
  const arrival = toMinutes(time24);
  if (arrival < toMinutes(restaurant.opensAt) || arrival > toMinutes(restaurant.closesAt)) {
    throw new ApiError(422, `Arrival time must be between ${to12Hour(restaurant.opensAt)} and ${to12Hour(restaurant.closesAt)}.`);
  }

  const today = businessNow(now).date;
  const leadMs = (restaurant.prepTimeMax - (options.graceMinutes ?? 0)) * 60_000;
  if (combineDateAndTime(today, time24).getTime() - now.getTime() < leadMs) {
    const window = computeArrivalWindow(restaurant, now);
    throw new ApiError(
      422,
      window.isOpen
        ? `Your food needs about ${restaurant.prepTimeMax} minutes to prepare. Please choose an arrival time of ${window.earliest} or later.`
        : "The restaurant isn't taking more orders today.",
    );
  }
  return today;
};
