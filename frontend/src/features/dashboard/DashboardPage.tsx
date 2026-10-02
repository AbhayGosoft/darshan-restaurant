import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { CalendarCheck, CalendarX2, LayoutDashboard, IndianRupee, Store, Users } from "lucide-react";
import { api } from "@/lib/api-client";
import { useAppStore } from "@/store/app-store";
import type { Restaurant, RestaurantBooking } from "@/types/domain";
import { LoadingGrid, StateView } from "@/components/ui/StateView";
import { formatNumber } from "@/lib/format";

type BookingResponse = { bookings: RestaurantBooking[] };

export function DashboardPage() {
  const { t } = useTranslation();
  const restaurant = useAppStore((state) => state.activeRestaurant);
  const selectedAdmin = useAppStore((state) => state.selectedAdmin);
  const isSuperAdmin = useAppStore((state) => state.admin?.role === "SUPERADMIN");
  const scope = restaurant ? "restaurant" : selectedAdmin ? "admin" : isSuperAdmin ? "all" : "admin";
  const restaurants = useQuery({
    queryKey: ["dashboard-restaurants", selectedAdmin?.id ?? "accessible"], enabled: !restaurant,
    queryFn: () => api<{ restaurants: Restaurant[] }>(`/admin/restaurants?${new URLSearchParams({ ...(selectedAdmin ? { adminId: selectedAdmin.id } : {}), limit: "500" })}`),
  });
  const bookings = useQuery({
    queryKey: ["dashboard-bookings", scope, selectedAdmin?.id ?? "", restaurant?.id ?? ""], enabled: Boolean(restaurant) || restaurants.isSuccess,
    queryFn: async () => {
      if (restaurant) return api<BookingResponse>(`/admin/bookings?${new URLSearchParams({ restaurantId: restaurant.id, limit: "100" })}`);
      const ids = restaurants.data?.restaurants.map((item) => item.id) ?? [];
      const results = await Promise.all(ids.map((id) => api<BookingResponse>(`/admin/bookings?${new URLSearchParams({ restaurantId: id, limit: "100" })}`)));
      return { bookings: results.flatMap((result) => result.bookings) };
    },
  });
  if ((!restaurant && restaurants.isLoading) || bookings.isLoading) return <main className="page"><LoadingGrid /></main>;
  if (restaurants.isError || bookings.isError) return <main className="page"><StateView title={t("dashboard.loadError")} message={t("common.loadErrorMessage")} action={() => { void restaurants.refetch(); void bookings.refetch(); }} /></main>;
  const allBookings = bookings.data?.bookings ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const todayBookings = allBookings.filter((booking) => booking.date === today);
  const upcoming = allBookings.filter((booking) => booking.status === "upcoming");
  const revenue = allBookings.filter((booking) => booking.status !== "cancelled").reduce((total, booking) => total + (booking.preorder?.total ?? booking.advancePaid ?? 0), 0);
  const heading = restaurant?.name ?? selectedAdmin?.name ?? (isSuperAdmin ? t("nav.allRestaurants") : t("nav.myRestaurants"));
  const subheading = t(restaurant ? "dashboard.scope.restaurant" : selectedAdmin ? "dashboard.scope.admin" : isSuperAdmin ? "dashboard.scope.all" : "dashboard.scope.own");
  return <main className="page">
    <section className="resource-head"><span className="eyebrow"><LayoutDashboard size={14} /> {subheading}</span></section>
    <section className="restaurant-hero-card"><div><strong>{heading}</strong><small>{restaurant ? t("dashboard.selectedRestaurant") : t("dashboard.currentScope")}</small></div></section>
    <div className="stat-grid">
      <div className="stat-card"><IndianRupee size={20} /><div><strong>₹{formatNumber(revenue)}</strong><small>{t("dashboard.revenue")}</small></div></div>
      <div className="stat-card"><CalendarCheck size={20} /><div><strong>{todayBookings.length}</strong><small>{t("dashboard.today")}</small></div></div>
      <div className="stat-card"><Users size={20} /><div><strong>{upcoming.length}</strong><small>{t("dashboard.upcoming")}</small></div></div>
      <div className="stat-card">{restaurant ? <Store size={20} /> : <CalendarX2 size={20} />}<div><strong>{restaurant ? 1 : restaurants.data?.restaurants.length ?? 0}</strong><small>{restaurant ? t("dashboard.restaurant") : t("dashboard.restaurants")}</small></div></div>
    </div>
    <section className="card"><header className="menu-category-card__head"><strong>{t("dashboard.recent")}</strong></header>{!allBookings.length && <small className="muted">{t("dashboard.noBookings")}</small>}<div className="menu-item-list">{allBookings.slice(0, 8).map((booking) => <div className="menu-item-row" key={booking.id}><div className="menu-item-row__body"><strong>{booking.fullName}</strong><small>{booking.restaurantName} · {t("common.dateAtTime", { date: booking.date, time: booking.time })} · {t("common.people", { count: booking.people })}</small></div><span className={`badge badge--${booking.status}`}>{t(`bookings.status.${booking.status}`)}</span></div>)}</div></section>
  </main>;
}
