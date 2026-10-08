import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Ban, CalendarDays, Phone, Users, X } from "lucide-react";
import { clsx } from "clsx";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api-client";
import { queryClient } from "@/lib/query-client";
import { useAppStore } from "@/store/app-store";
import { formatDateDMY } from "@/lib/format";
import { BOOKING_STATUSES, NEXT_BOOKING_STATUS, RESTAURANT_CANCELLABLE, type ActiveBookingStatus, type AdvanceBookingStatus, type Pagination, type RestaurantBooking } from "@/types/domain";
import { Button } from "@/components/ui/Button";
import { DateInput } from "@/components/ui/DateInput";
import { LoadingGrid, StateView } from "@/components/ui/StateView";
import { ResourceDialog, ResourceToolbar } from "@/components/resource/dialog-kit";

const PAGE_SIZES = [10, 20, 50] as const;

// Values are sent to the API as-is (it validates these English labels); only the display text is translated.
const CANCEL_REASONS = ["Change of plans", "Booked by mistake", "Found a better option", "Restaurant not responding", "Other"] as const;
const CANCEL_REASON_KEYS = Object.fromEntries(CANCEL_REASONS.map((reason) => [reason, true]));

type StatusActionResult = { booking: RestaurantBooking };

/** Local calendar date as "YYYY-MM-DD", offset by whole days. */
const isoDay = (offsetDays = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

export function BookingsPage() {
  const restaurantId = useAppStore((state) => state.activeRestaurant?.id);
  const isSuperAdmin = useAppStore((state) => state.admin?.role === "SUPERADMIN");
  const [status, setStatus] = useState("");
  // Default view: today's orders, soonest arrival first. Emptying either date leaves that side open.
  const [range, setRange] = useState(() => ({ from: isoDay(), to: isoDay() }));
  const [sort, setSort] = useState<"asc" | "desc">("asc");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [selected, setSelected] = useState<RestaurantBooking | null>(null);
  const [cancelReason, setCancelReason] = useState<string>(CANCEL_REASONS[0]);
  const [rejectReason, setRejectReason] = useState("");
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
    openDetails(linkedBooking.data);
    setSearchParams({}, { replace: true });
  }, [linkedBooking.data, setSearchParams]);

  // Debounce typing so every keystroke doesn't hit the API.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const statusOptions = [
    { value: "", label: t("bookings.allStatuses") },
    { value: "active", label: t("bookings.activeStatuses") },
    ...BOOKING_STATUSES.map((value) => ({ value, label: t(`bookings.status.${value}`) })),
  ];

  const query = useQuery({
    queryKey: ["admin-bookings", restaurantId, status, range.from, range.to, search, sort, page, pageSize, isSuperAdmin],
    queryFn: () =>
      api<{ bookings: RestaurantBooking[]; pagination: Pagination }>(
        `/admin/bookings?${new URLSearchParams({
          ...(restaurantId ? { restaurantId } : {}),
          ...(status ? { status } : {}),
          ...(range.from ? { from: range.from } : {}),
          ...(range.to ? { to: range.to } : {}),
          ...(search ? { search } : {}),
          sort,
          page: String(page),
          limit: String(pageSize),
        })}`,
      ),
    placeholderData: keepPreviousData, // keep the table on screen while the next page loads
  });

  // Every action returns the updated booking: refresh the list and keep an open detail dialog in sync.
  const afterAction = async (result: StatusActionResult) => {
    setSelected((current) => (current && current.id === result.booking.id ? result.booking : current));
    await queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
  };

  const advance = useMutation({
    mutationFn: ({ id, to }: { id: string; to: AdvanceBookingStatus }) => api<StatusActionResult>(`/admin/bookings/${id}/status`, { method: "POST", body: { status: to } }),
    onSuccess: afterAction,
  });
  const reject = useMutation({
    mutationFn: (id: string) => api<StatusActionResult>(`/admin/bookings/${id}/reject`, { method: "POST", body: rejectReason.trim() ? { reason: rejectReason.trim() } : {} }),
    onSuccess: afterAction,
  });
  const cancel = useMutation({
    mutationFn: (id: string) => api<StatusActionResult>(`/admin/bookings/${id}/cancel`, { method: "POST", body: { reason: cancelReason } }),
    onSuccess: afterAction,
  });

  const openDetails = (booking: RestaurantBooking) => {
    advance.reset();
    reject.reset();
    cancel.reset();
    setRejectReason("");
    setCancelReason(CANCEL_REASONS[0]);
    setSelected(booking);
  };

  const changeStatus = (value: string) => {
    setStatus(value);
    setPage(1);
  };
  const changeRange = (patch: Partial<typeof range>) => {
    setRange((current) => ({ ...current, ...patch }));
    setPage(1);
  };
  const isFiltered = Boolean(status || searchInput || range.from !== isoDay() || range.to !== isoDay() || sort !== "asc");
  const clearFilters = () => {
    setStatus("");
    setSearchInput("");
    setSearch("");
    setRange({ from: isoDay(), to: isoDay() });
    setSort("asc");
    setPage(1);
  };

  const bookings = query.data?.bookings ?? [];
  const pageInfo = query.data?.pagination;
  const today = isoDay();
  const tomorrow = isoDay(1);
  const dayLabel = (date: string) => (date === today ? t("bookings.today") : date === tomorrow ? t("bookings.tomorrow") : null);
  const isClosed = (booking: RestaurantBooking) => !RESTAURANT_CANCELLABLE.includes(booking.status);

  /** "Acknowledge" / "Start preparing" / "Mark ready" / "Complete" — the one forward step for this order. */
  const nextStepButton = (booking: RestaurantBooking, size: "row" | "dialog") => {
    const next = NEXT_BOOKING_STATUS[booking.status];
    if (!next) return null;
    const pending = advance.isPending && advance.variables?.id === booking.id;
    return (
      <Button
        type="button"
        variant={size === "row" ? "secondary" : "primary"}
        className={clsx(size === "row" && "bookings-table__action")}
        loading={pending}
        disabled={advance.isPending && !pending}
        onClick={(event) => {
          event.stopPropagation();
          advance.mutate({ id: booking.id, to: next });
        }}
      >
        {t(`bookings.actions.${next}`)}
      </Button>
    );
  };

  return (
    <main className="page">
      <section className="resource-head">
        <span className="eyebrow"><CalendarDays size={14} /> {t("bookings.title")}</span>
      </section>

      <ResourceToolbar
        search={searchInput}
        onSearchChange={setSearchInput}
        placeholder={t("bookings.searchPlaceholder")}
        filter={status}
        onFilterChange={changeStatus}
        filterOptions={statusOptions}
      >
        <div className="date-range-filter">
          <DateInput className="filter-select" aria-label={t("bookings.fromDate")} title={t("bookings.fromDate")} value={range.from} max={range.to || undefined} onChange={(event) => changeRange({ from: event.target.value })} />
          <span>{t("bookings.to")}</span>
          <DateInput className="filter-select" aria-label={t("bookings.toDate")} title={t("bookings.toDate")} value={range.to} min={range.from || undefined} onChange={(event) => changeRange({ to: event.target.value })} />
        </div>
        <button type="button" className="toolbar-clear-button" onClick={clearFilters} disabled={!isFiltered}>{t("common.clear")}</button>
      </ResourceToolbar>

      {/* Row-level quick actions surface their errors here, since there's no dialog open. */}
      {advance.error && !selected && <div className="form-error">{advance.error.message}</div>}

      {query.isLoading && <LoadingGrid />}
      {query.isError && <StateView title={t("bookings.loadError")} message={t("common.loadErrorMessage")} action={() => void query.refetch()} />}
      {query.isSuccess && !bookings.length && (
        isFiltered
          ? <StateView title={t("bookings.noMatchTitle")} message={t("bookings.noMatchMessage")} />
          : <StateView title={t("bookings.emptyTitle")} message={t("bookings.emptyMessage")} />
      )}

      {bookings.length > 0 && (
        <div className={clsx("table-scroll", query.isPlaceholderData && "table-scroll--loading")}>
          <table className="data-table bookings-table">
            <thead>
              {/* Table booking disabled — the Table column is replaced by the ordered items count. */}
              <tr>
                <th>{t("bookings.columns.booking")}</th>
                <th>{t("bookings.columns.guest")}</th>
                <th aria-sort={sort === "asc" ? "ascending" : "descending"}>
                  <button
                    type="button"
                    className="sort-header"
                    title={t(sort === "asc" ? "bookings.sortSoonest" : "bookings.sortLatest")}
                    onClick={() => {
                      setSort((current) => (current === "asc" ? "desc" : "asc"));
                      setPage(1);
                    }}
                  >
                    {t("bookings.columns.arrival")} {sort === "asc" ? <ArrowUp size={13} /> : <ArrowDown size={13} />}
                  </button>
                </th>
                <th>{t("bookings.columns.items")}</th>
                <th>{t("bookings.columns.people")}</th>
                <th>{t("bookings.columns.status")}</th>
                <th className="data-table__num">{t("bookings.columns.paid")}</th>
                <th>{t("bookings.columns.action")}</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => {
                const label = dayLabel(booking.date);
                return (
                  <tr key={booking.id} className={clsx("data-table__row", booking.date === today && !isClosed(booking) && "data-table__row--today")} onClick={() => openDetails(booking)}>
                    <td><strong className="bookings-table__id">{booking.humanBookingId}</strong></td>
                    <td>{booking.fullName}<br /><small className="muted">{booking.mobileNumber}</small></td>
                    <td className="bookings-table__when">
                      <strong>{booking.time}</strong>
                      <small className="muted">{label && <><span className="bookings-table__day">{label}</span> · </>}{formatDateDMY(booking.date)}</small>
                    </td>
                    {/* <td>{booking.table?.name ?? "Auto/capacity"}</td> */}
                    <td>{booking.preorder?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0}</td>
                    <td>{booking.people}</td>
                    <td><span className={clsx("badge", `badge--${booking.status}`)}>{t(`bookings.status.${booking.status}`)}</span></td>
                    <td className="data-table__num">₹{booking.advancePaid}</td>
                    <td>{nextStepButton(booking, "row") ?? <span className="muted">—</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {pageInfo && pageInfo.total > 0 && (
        <div className="pagination-row pagination-row--split">
          <span>{t("bookings.showingRange", { from: (pageInfo.page - 1) * pageInfo.limit + 1, to: Math.min(pageInfo.page * pageInfo.limit, pageInfo.total), total: pageInfo.total })}</span>
          <div className="pagination-row__controls">
            <select className="filter-select pagination-row__size" aria-label={t("bookings.perPage")} value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}>
              {PAGE_SIZES.map((size) => <option key={size} value={size}>{t("bookings.perPageOption", { count: size })}</option>)}
            </select>
            <Button type="button" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>{t("bookings.previous")}</Button>
            <span>{t("bookings.pageOf", { page, total: Math.max(pageInfo.totalPages, 1) })}</span>
            <Button type="button" variant="secondary" disabled={!pageInfo.hasNextPage} onClick={() => setPage((p) => p + 1)}>{t("bookings.next")}</Button>
          </div>
        </div>
      )}

      {selected && (
        <ResourceDialog title={selected.humanBookingId} eyebrow={t("bookings.details")} onClose={() => setSelected(null)}>
          <div className="booking-detail-body">
            <div className="booking-detail-row"><Users size={16} /> {selected.fullName} · {t("common.people", { count: selected.people })}</div>
            <div className="booking-detail-row"><Phone size={16} /> {selected.mobileNumber}</div>
            <div className="booking-detail-row"><CalendarDays size={16} /> {t("bookings.arrivalAt", { date: formatDateDMY(selected.date), time: selected.time })}</div>
            {/* Table booking disabled:
            <div className="booking-detail-row">Table preference: <strong>{selected.tablePreference}</strong></div>
            {selected.table && <div className="booking-detail-row">Assigned table: <strong>{selected.table.name}</strong>{selected.table.section ? ` · ${selected.table.section}` : ""}</div>} */}
            {selected.preorder && <div className="booking-detail-row">{t("bookings.orderedItems")}: <strong>₹{selected.preorder.total}</strong><br />{selected.preorder.items.map((item) => <span key={item.id}>{item.quantity}× {item.name} · ₹{item.lineTotal}<br /></span>)}</div>}
            {selected.specialRequest && <div className="booking-detail-row">{t("bookings.specialRequest")}: {selected.specialRequest}</div>}
            <div className="booking-detail-row">{t("bookings.amountPaid")}: <strong>₹{selected.advancePaid}</strong></div>
            <div className="booking-detail-row">{t("bookings.statusLabel")}: <span className={clsx("badge", `badge--${selected.status}`)}>{t(`bookings.status.${selected.status}`)}</span></div>
            {selected.status === "cancelled" && selected.cancelledBy && <div className="booking-detail-row">{t("bookings.cancelledBy")}: {t(`bookings.actors.${selected.cancelledBy}`)}</div>}
            {selected.cancellationReason && <div className="booking-detail-row">{t("bookings.cancellationReason")}: {selected.cancellationReason in CANCEL_REASON_KEYS ? t(`bookings.cancelReasons.${selected.cancellationReason as (typeof CANCEL_REASONS)[number]}`) : selected.cancellationReason}</div>}
            {selected.status === "rejected" && <div className="booking-detail-row">{t("bookings.rejectionReason")}: {selected.rejectionReason || t("bookings.noReasonGiven")}</div>}
            {selected.refund && <div className="booking-detail-row">{t("bookings.refund")}: {selected.refund.eligible ? t("bookings.refundEligible", { amount: selected.refund.amount }) : t("bookings.refundNotEligible")}</div>}

            {NEXT_BOOKING_STATUS[selected.status] && (
              <div className="booking-action-row">
                {nextStepButton(selected, "dialog")}
                <small className="muted">{t(`bookings.actionHints.${selected.status as ActiveBookingStatus}`)}</small>
              </div>
            )}
            {advance.error && <div className="form-error">{advance.error.message}</div>}

            {selected.status === "upcoming" && (
              <div className="booking-cancel-row">
                <input value={rejectReason} maxLength={500} placeholder={t("bookings.rejectReasonPlaceholder")} aria-label={t("bookings.rejectionReason")} onChange={(event) => setRejectReason(event.target.value)} />
                <Button type="button" variant="ghost" loading={reject.isPending} onClick={() => reject.mutate(selected.id)}><Ban size={15} /> {t("bookings.rejectOrder")}</Button>
              </div>
            )}
            {reject.error && <div className="form-error">{reject.error.message}</div>}

            {RESTAURANT_CANCELLABLE.includes(selected.status) && (
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
