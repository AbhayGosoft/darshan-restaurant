import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { clsx } from "clsx";
import { Bell, CalendarCheck } from "lucide-react";
import { api } from "@/lib/api-client";
import { queryClient } from "@/lib/query-client";
import { useBackCloseable } from "@/lib/modal-stack";
import { formatNumber, timeAgo } from "@/lib/format";
import { useAppStore } from "@/store/app-store";

export type BookingNotification = {
  bookingId: string;
  humanBookingId: string;
  restaurantId: string;
  restaurantName: string;
  restaurantImage: string | null;
  fullName: string;
  people: number;
  date: string;
  time: string;
  amount: number;
  status: "upcoming" | "cancelled";
  createdAt: string;
  unread: boolean;
};

type NotificationFeed = { unreadCount: number; seenAt: string; items: BookingNotification[] };

export const NOTIFICATIONS_QUERY_KEY = ["admin-notifications"] as const;

/** Header bell: unread new-booking count, a dropdown feed, and a jump to the booking on click.
 * Live updates come from SocketProvider invalidating NOTIFICATIONS_QUERY_KEY on booking events. */
export function NotificationBell() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const enterRestaurant = useAppStore((state) => state.enterRestaurant);
  const [open, setOpen] = useState(false);
  // Items that were unread when the panel was opened stay highlighted until it closes,
  // even though opening it marks them seen on the server.
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set());
  const rootRef = useRef<HTMLDivElement>(null);

  const feed = useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEY,
    queryFn: () => api<NotificationFeed>("/admin/notifications?limit=20"),
    refetchInterval: 60_000, // safety net if the socket drops
  });

  const markSeen = useMutation({
    mutationFn: () => api("/admin/notifications/seen", { method: "POST" }),
    onSuccess: () => queryClient.setQueryData<NotificationFeed>(NOTIFICATIONS_QUERY_KEY, (current) => current && { ...current, unreadCount: 0 }),
  });

  const resetSeen = markSeen.reset;
  const close = useCallback(() => {
    setOpen(false);
    setHighlighted(new Set());
    resetSeen(); // a failed "seen" call gets another try next time the panel opens
  }, [resetSeen]);
  useBackCloseable(open, close);

  useEffect(() => {
    if (!open) return;
    const closeOnOutside = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) close();
    };
    const closeOnEscape = (event: KeyboardEvent) => event.key === "Escape" && close();
    document.addEventListener("mousedown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open, close]);

  // Opening the panel (or a booking arriving while it is open) marks everything seen.
  // Stops retrying after a failed call so an API error can't loop on every render.
  const unreadCount = feed.data?.unreadCount ?? 0;
  const { mutate: sendSeen, isPending: seenPending, isError: seenFailed } = markSeen;
  useEffect(() => {
    if (!open || unreadCount === 0 || seenPending || seenFailed) return;
    const unreadIds = (feed.data?.items ?? []).filter((item) => item.unread).map((item) => item.bookingId);
    setHighlighted((current) => new Set([...current, ...unreadIds]));
    sendSeen();
  }, [open, unreadCount, feed.data, sendSeen, seenPending, seenFailed]);

  const toggle = () => (open ? close() : setOpen(true));

  const openBooking = (item: BookingNotification) => {
    close();
    enterRestaurant({ id: item.restaurantId, name: item.restaurantName, banner: item.restaurantImage });
    navigate(`/bookings?booking=${encodeURIComponent(item.bookingId)}`);
  };

  const items = feed.data?.items ?? [];

  return (
    <div className="notification-bell" ref={rootRef}>
      <button
        type="button"
        className={clsx("context-action notification-bell__trigger", open && "active")}
        aria-label={unreadCount ? t("notifications.bellAriaUnread", { count: unreadCount }) : t("notifications.bellAria")}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={toggle}
      >
        <Bell size={16} />
        {unreadCount > 0 && <span className="notification-bell__badge">{unreadCount > 99 ? "99+" : unreadCount}</span>}
      </button>
      {open && (
        <div className="notification-panel notification-bell__panel" role="dialog" aria-label={t("notifications.title")}>
          <div className="notification-panel__head"><strong>{t("notifications.title")}</strong></div>
          {feed.isError && <div className="notification-panel__empty">{t("notifications.loadError")}</div>}
          {feed.isSuccess && !items.length && <div className="notification-panel__empty">{t("notifications.empty")}</div>}
          {items.length > 0 && (
            <div className="notification-panel__list">
              {items.map((item) => (
                <button
                  key={item.bookingId}
                  type="button"
                  className={clsx("notification-item", (item.unread || highlighted.has(item.bookingId)) && "notification-item--unread")}
                  onClick={() => openBooking(item)}
                >
                  <span className="notification-item__dot" />
                  <span className="notification-item__icon"><CalendarCheck size={16} /></span>
                  <span className="notification-item__body">
                    <strong>{t("notifications.newBooking", { restaurant: item.restaurantName })}</strong>
                    <small>
                      {item.fullName} · {t("common.people", { count: item.people })} · {t("common.dateAtTime", { date: item.date, time: item.time })}
                      {item.status === "cancelled" && <> · <span className="notification-item__cancelled">{t("bookings.status.cancelled")}</span></>}
                    </small>
                    <span className="notification-item__time">{item.humanBookingId} · ₹{formatNumber(item.amount)} · {timeAgo(item.createdAt)}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
