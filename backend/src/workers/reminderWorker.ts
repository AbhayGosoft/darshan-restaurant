import { Worker } from "bullmq";
import { prisma } from "../lib/prisma.js";
import { redisConnectionOptions } from "../redis/connection.js";
import { bookingNotificationMessage, notifyCustomer } from "../services/notificationService.js";
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
        message: bookingNotificationMessage("reminder", booking),
      });
    },
    { connection: redisConnectionOptions(), concurrency: 5 },
  );
