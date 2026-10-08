import { Worker } from "bullmq";
import { prisma } from "../lib/prisma.js";
import { redisConnectionOptions } from "../redis/connection.js";
import { notifyCustomer } from "../services/notificationService.js";
import { to12Hour } from "../utils/slotTime.js";
import { ACTIVE_BOOKING_STATUSES } from "../constants/bookingStatus.js";

export const createReminderWorker = () =>
  new Worker(
    "booking-reminder",
    async (job) => {
      const { bookingId } = job.data as { bookingId: string };
      const booking = await prisma.restaurantBooking.findUnique({ where: { id: bookingId } });
      if (!booking || !ACTIVE_BOOKING_STATUSES.includes(booking.status)) return;

      await notifyCustomer({
        restaurantUserId: booking.restaurantUserId,
        type: "BOOKING_REMINDER",
        bookingId: booking.id,
        title: "Your order is coming up",
        body: `Reminder: you're expected at ${booking.restaurantNameSnapshot} at ${to12Hour(booking.time)} today for order ${booking.humanBookingId}.`,
      });
    },
    { connection: redisConnectionOptions(), concurrency: 5 },
  );
