import type { NotificationType, RestaurantBooking } from "../../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { sendOneSignalPush } from "../lib/oneSignal.js";
import { emitToCustomer } from "../socket/server.js";
import { socketEvents } from "../socket/socketEvents.js";
import { DEFAULT_LANGUAGE, normalizeLanguage, type Language } from "../i18n/languages.js";
import { notificationText, type NotificationEvent, type NotificationVars } from "../i18n/messages.js";
import { translator } from "../i18n/translations.js";
import { to12Hour } from "../utils/slotTime.js";

type NotificationMessage = (lang: Language) => { title: string; body: string };

/** Notification copy for a booking event, with the restaurant name in the customer's language. */
export const bookingNotificationMessage =
  (event: NotificationEvent, booking: RestaurantBooking, extra: Partial<Pick<NotificationVars, "amount" | "reason">> = {}): NotificationMessage =>
  (lang) =>
    notificationText(event, lang, {
      orderId: booking.humanBookingId,
      restaurant: translator(booking.translationsSnapshot, lang)("name", booking.restaurantNameSnapshot),
      time: to12Hour(booking.time),
      people: booking.people,
      amount: extra.amount ?? Number(booking.advancePaid),
      reason: extra.reason,
    });

/**
 * Stores, emits and pushes a notification written in the customer's saved language
 * (the one their app last sent), so the stored copy matches what the push showed.
 */
export const notifyCustomer = async (input: {
  restaurantUserId: string;
  type: NotificationType;
  bookingId?: string;
  message: NotificationMessage;
}) => {
  const user = await prisma.restaurantUser.findUnique({ where: { id: input.restaurantUserId }, select: { playerId: true, language: true } });
  const lang = normalizeLanguage(user?.language) ?? DEFAULT_LANGUAGE;
  const { title, body } = input.message(lang);

  const notification = await prisma.notification.create({
    data: {
      restaurantUserId: input.restaurantUserId,
      type: input.type,
      bookingId: input.bookingId,
      title,
      body,
    },
  });

  emitToCustomer(input.restaurantUserId, socketEvents.notificationNew, notification);

  if (user?.playerId) {
    await sendOneSignalPush({
      playerId: user.playerId,
      title,
      body,
      data: { type: input.type, bookingId: input.bookingId },
    });
  }

  return { notification, lang };
};
