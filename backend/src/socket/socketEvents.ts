import type { Notification, RestaurantBooking } from "../../generated/prisma/client.js";

export const socketEvents = {
  bookingNew: "restaurant:booking:new",
  bookingModified: "restaurant:booking:modified",
  bookingCancelled: "restaurant:booking:cancelled",
  /** Any order status change (acknowledged, preparing, ready, completed, cancelled, rejected). */
  bookingStatusChanged: "restaurant:booking:status",
  /** Sent to the customer's own room with the full booking response after a status change. */
  customerBookingUpdated: "customer:booking:updated",
  notificationNew: "restaurant:notification:new",
} as const;

export type BookingSocketPayload = RestaurantBooking;
export type NotificationSocketPayload = Notification;
