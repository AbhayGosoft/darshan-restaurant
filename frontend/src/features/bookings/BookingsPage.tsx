import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CalendarDays, Phone, Users, X } from "lucide-react";
import { clsx } from "clsx";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api-client";
import { queryClient } from "@/lib/query-client";
import { useAppStore } from "@/store/app-store";
import type { Pagination, RestaurantBooking } from "@/types/domain";
import { Button } from "@/components/ui/Button";
import { LoadingGrid, StateView } from "@/components/ui/StateView";
import { ResourceDialog, ResourceToolbar } from "@/components/resource/dialog-kit";

const STATUSES = ["upcoming", "past", "cancelled"] as const;

// Values are sent to the API as-is (it validates these English labels); only the display text is translated.
const CANCEL_REASONS = ["Change of plans", "Booked by mistake", "Found a better option", "Restaurant not responding", "Other"] as const;
const CANCEL_REASON_KEYS = Object.fromEntries(CANCEL_REASONS.map((reason) => [reason, true]));

export function BookingsPage() {
  const restaurantId = useAppStore((state) => state.activeRestaurant?.id);
  const isSuperAdmin = useAppStore((state) => state.admin?.role === "SUPERADMIN");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<RestaurantBooking | null>(null);
  const [cancelReason, setCancelReason] = useState<string>(CANCEL_REASONS[0]);
  const { t } = useTranslation();
  // Deep link from the header bell: /bookings?booking=<id> opens that booking's detail.
  const [searchParams, setSearchParams] = useSearchParams();
  const linkedBookingId = searchParams.get("booking");
  const linkedBooking = useQuery({
    queryKey: ["admin-booking", linkedBookingId],
    queryFn: () => api<RestaurantBooking>(`/admin/bookings/${linkedBookingId}`),
    enabled: Boolean(linkedBookingId),
  });
  useEffect(() => {
    if (!linkedBooking.data) return;
    setSelected(linkedBooking.data);
    setSearchParams({}, { replace: true });
  }, [linkedBooking.data, setSearchParams]);
  const statusOptions = [{ value: "", label: t("bookings.allStatuses") }, ...STATUSES.map((value) => ({ value, label: t(`bookings.status.${value}`) }))];

  const query = useQuery({
    queryKey: ["admin-bookings", restaurantId, status, page, isSuperAdmin],
    queryFn: () =>
      api<{ bookings: RestaurantBooking[]; pagination: Pagination }>(
        `/admin/bookings?${new URLSearchParams({ ...(restaurantId ? { restaurantId } : {}), ...(status ? { status } : {}), page: String(page), limit: "20" })}`,
      ),
  });

  const cancel = useMutation({
    mutationFn: (id: string) => api(`/admin/bookings/${id}/cancel`, { method: "POST", body: { reason: cancelReason } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      setSelected(null);
    },
  });

  const bookings = query.data?.bookings ?? [];

  return (
    <main className="page">
      <section className="resource-head">
        <span className="eyebrow"><CalendarDays size={14} /> {t("bookings.title")}</span>
      </section>

      <ResourceToolbar
        search=""
        onSearchChange={() => {}}
        placeholder=""
        filter={status}
        onFilterChange={(value) => { setStatus(value); setPage(1); }}
        filterOptions={statusOptions}
      />

      {query.isLoading && <LoadingGrid />}
      {query.isError && <StateView title={t("bookings.loadError")} message={t("common.loadErrorMessage")} action={() => void query.refetch()} />}
      {query.isSuccess && !bookings.length && <StateView title={t("bookings.emptyTitle")} message={t("bookings.emptyMessage")} />}

      {bookings.length > 0 && (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              {/* Table booking disabled — the Table column is replaced by the ordered items count. */}
              <tr><th>{t("bookings.columns.booking")}</th><th>{t("bookings.columns.guest")}</th><th>{t("bookings.columns.dateTime")}</th><th>{t("bookings.columns.items")}</th><th>{t("bookings.columns.people")}</th><th>{t("bookings.columns.status")}</th><th>{t("bookings.columns.paid")}</th></tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr key={booking.id} className="data-table__row" onClick={() => setSelected(booking)}>
                  <td>{booking.humanBookingId}</td>
                  <td>{booking.fullName}<br /><small className="muted">{booking.mobileNumber}</small></td>
                  <td>{booking.date} · {booking.time}</td>
                  {/* <td>{booking.table?.name ?? "Auto/capacity"}</td> */}
                  <td>{booking.preorder?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0}</td>
                  <td>{booking.people}</td>
                  <td><span className={clsx("badge", `badge--${booking.status}`)}>{t(`bookings.status.${booking.status}`)}</span></td>
                  <td>₹{booking.advancePaid}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {query.data && query.data.pagination.totalPages > 1 && (
        <div className="pagination-row">
          <Button type="button" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>{t("bookings.previous")}</Button>
          <span>{t("bookings.pageOf", { page, total: query.data.pagination.totalPages })}</span>
          <Button type="button" variant="secondary" disabled={!query.data.pagination.hasNextPage} onClick={() => setPage((p) => p + 1)}>{t("bookings.next")}</Button>
        </div>
      )}

      {selected && (
        <ResourceDialog title={selected.humanBookingId} eyebrow={t("bookings.details")} onClose={() => setSelected(null)}>
          <div className="booking-detail-body">
            <div className="booking-detail-row"><Users size={16} /> {selected.fullName} · {t("common.people", { count: selected.people })}</div>
            <div className="booking-detail-row"><Phone size={16} /> {selected.mobileNumber}</div>
            <div className="booking-detail-row"><CalendarDays size={16} /> {t("common.dateAtTime", { date: selected.date, time: selected.time })}</div>
            {/* Table booking disabled:
            <div className="booking-detail-row">Table preference: <strong>{selected.tablePreference}</strong></div>
            {selected.table && <div className="booking-detail-row">Assigned table: <strong>{selected.table.name}</strong>{selected.table.section ? ` · ${selected.table.section}` : ""}</div>} */}
            {selected.preorder && <div className="booking-detail-row">{t("bookings.orderedItems")}: <strong>₹{selected.preorder.total}</strong><br />{selected.preorder.items.map((item) => <span key={item.id}>{item.quantity}× {item.name} · ₹{item.lineTotal}<br /></span>)}</div>}
            {selected.specialRequest && <div className="booking-detail-row">{t("bookings.specialRequest")}: {selected.specialRequest}</div>}
            <div className="booking-detail-row">{t("bookings.amountPaid")}: <strong>₹{selected.advancePaid}</strong></div>
            <div className="booking-detail-row">{t("bookings.statusLabel")}: <span className={clsx("badge", `badge--${selected.status}`)}>{t(`bookings.status.${selected.status}`)}</span></div>
            {selected.cancellationReason && <div className="booking-detail-row">{t("bookings.cancellationReason")}: {selected.cancellationReason in CANCEL_REASON_KEYS ? t(`bookings.cancelReasons.${selected.cancellationReason as (typeof CANCEL_REASONS)[number]}`) : selected.cancellationReason}</div>}
            {selected.refund && <div className="booking-detail-row">{t("bookings.refund")}: {selected.refund.eligible ? t("bookings.refundEligible", { amount: selected.refund.amount }) : t("bookings.refundNotEligible")}</div>}

            {selected.status === "upcoming" && (
              <div className="booking-cancel-row">
                <select value={cancelReason} onChange={(event) => setCancelReason(event.target.value)}>
                  {CANCEL_REASONS.map((reason) => <option key={reason} value={reason}>{t(`bookings.cancelReasons.${reason}`)}</option>)}
                </select>
                <Button type="button" variant="ghost" loading={cancel.isPending} onClick={() => cancel.mutate(selected.id)}><X size={15} /> {t("bookings.cancelBooking")}</Button>
              </div>
            )}
            {cancel.error && <div className="form-error">{cancel.error.message}</div>}
          </div>
        </ResourceDialog>
      )}
    </main>
  );
}
