import { policy } from "../config/policy.js";
import { to24Hour } from "./slotTime.js";

/** Parses a "YYYY-MM-DD" string into a UTC-midnight Date, or throws. */
export const parseDateOnly = (value: string): Date => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`Invalid date: ${value}`);
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid date: ${value}`);
  return date;
};

export const formatDateOnly = (date: Date): string => date.toISOString().slice(0, 10);

/** Wall-clock parts of an instant as seen in the restaurant's business timezone. */
const zonedParts = (instant: Date, timeZone = policy.businessTimeZone) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour"), minute: get("minute"), second: get("second") };
};

/** Today's calendar date in the business timezone, as a UTC-midnight Date (same shape as parseDateOnly). */
export const startOfBusinessToday = (now = new Date()): Date => {
  const { year, month, day } = zonedParts(now);
  return new Date(Date.UTC(year, month - 1, day));
};

/** Current business-timezone date (UTC-midnight Date) and "HH:mm" wall-clock time — the same shape
 * bookings store, so they can be compared directly in database queries. */
export const businessNow = (now = new Date()) => {
  const { year, month, day, hour, minute } = zonedParts(now);
  return { date: new Date(Date.UTC(year, month - 1, day)), time: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}` };
};

/** Combines a DATE-only value with a "h:mm AM/PM" or "HH:mm" time (restaurant wall-clock time
 * in the business timezone) into the real instant it refers to. */
export const combineDateAndTime = (date: Date, time: string): Date => {
  const time24 = /am|pm/i.test(time) ? to24Hour(time) : time;
  const [hourStr, minuteStr] = time24.split(":");
  const wallClockAsUtc = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), Number(hourStr), Number(minuteStr));
  const seen = zonedParts(new Date(wallClockAsUtc));
  const offsetMs = Date.UTC(seen.year, seen.month - 1, seen.day, seen.hour, seen.minute, seen.second) - wallClockAsUtc;
  return new Date(wallClockAsUtc - offsetMs);
};
