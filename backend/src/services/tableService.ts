import type { Prisma, PrismaClient } from "../../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { getActiveRestaurantOrThrow } from "./restaurantService.js";
import { ApiError } from "../utils/http.js";
import { formatDateOnly, parseDateOnly } from "../utils/dates.js";
import { isValidTime12, to12Hour, to24Hour } from "../utils/slotTime.js";
import type { TablePreference } from "../../generated/prisma/enums.js";
import { TABLE_PREFERENCE_BY_LABEL } from "../constants/bookingOptions.js";

type PrismaTx = PrismaClient | Prisma.TransactionClient;

/** Admin-facing check: which physical tables are free for a specific date/time/party size
 * (useful for walk-ins or manual table assignment). Table booking is disabled for customers. */
export const getTableAvailability = async (restaurantId: string, dateStr: string, time12: string, people: number, preferenceLabel?: string) => {
  await getActiveRestaurantOrThrow(restaurantId);

  let date: Date;
  try {
    date = parseDateOnly(dateStr);
  } catch {
    throw new ApiError(422, "Invalid date. Use YYYY-MM-DD format.");
  }
  if (!isValidTime12(time12)) {
    throw new ApiError(422, 'Invalid time format. Use e.g. "12:00 PM".');
  }
  if (!Number.isInteger(people) || people < 1) {
    throw new ApiError(422, "people must be a positive integer.");
  }
  const time = to24Hour(time12);
  const preference = preferenceLabel ? TABLE_PREFERENCE_BY_LABEL[preferenceLabel] : "ANY";

  const [tables, bookedTables] = await Promise.all([
    prisma.diningTable.findMany({ where: { restaurantId, status: "ACTIVE" }, orderBy: [{ capacity: "asc" }, { name: "asc" }] }),
    prisma.restaurantBooking.findMany({
      where: { restaurantId, date, time, status: { in: ["UPCOMING", "ACKNOWLEDGED", "PREPARING", "READY"] }, tableId: { not: null } },
      select: { tableId: true },
    }),
  ]);

  const bookedIds = new Set(bookedTables.map((booking) => booking.tableId));
  const eligibleTables = tables.filter((table) => table.capacity >= people && (preference === "ANY" || table.preference === preference));
  const availableTables = eligibleTables.filter((table) => !bookedIds.has(table.id));

  return {
    date: formatDateOnly(date),
    time: to12Hour(time),
    people,
    hasTables: tables.length > 0,
    availableCount: availableTables.length,
    tables: availableTables.map((table) => ({ id: table.id, name: table.name, capacity: table.capacity, preference: table.preference, section: table.section })),
  };
};

/** Finds a free, smallest-capacity table. Kept for when table booking is re-enabled. */
export const findAvailableTable = async (
  client: PrismaTx,
  input: { restaurantId: string; date: Date; time: string; people: number; preference: TablePreference; tableId?: string; excludeBookingId?: string },
) => {
  const tables = (await client.diningTable.findMany({
    where: {
      restaurantId: input.restaurantId,
      status: "ACTIVE",
      capacity: { gte: input.people },
      ...(input.tableId ? { id: input.tableId } : {}),
      ...(input.preference !== "ANY" ? { preference: input.preference } : {}),
    },
    orderBy: [{ capacity: "asc" }, { name: "asc" }],
  })) ?? [];
  if (!tables.length) {
    const tableCount = (await client.diningTable.count({ where: { restaurantId: input.restaurantId } })) ?? 0;
    return { hasTables: tableCount > 0, table: null };
  }
  const busy = (await client.restaurantBooking.findMany({
    where: { restaurantId: input.restaurantId, date: input.date, time: input.time, status: { in: ["UPCOMING", "ACKNOWLEDGED", "PREPARING", "READY"] }, tableId: { not: null }, ...(input.excludeBookingId ? { id: { not: input.excludeBookingId } } : {}) },
    select: { tableId: true },
  })) ?? [];
  const busyIds = new Set(busy.map((booking) => booking.tableId));
  return { hasTables: true, table: tables.find((table) => !busyIds.has(table.id)) ?? null };
};
