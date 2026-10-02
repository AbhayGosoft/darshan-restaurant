import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight, Ban, MapPin, Plus, RotateCcw, Trash2, UtensilsCrossed } from "lucide-react";
import { api, resolveAssetUrl } from "@/lib/api-client";
import { queryClient } from "@/lib/query-client";
import { useAppStore } from "@/store/app-store";
import type { HardDeleteResult, Restaurant } from "@/types/domain";
import { Button } from "@/components/ui/Button";
import { LoadingGrid, StateView } from "@/components/ui/StateView";
import { ConfirmDialog, DialogFooter, FieldError, Notice, PhoneField, ResourceDialog, ResourceToolbar, Req, StatusTabs, cleanBody, hardDeleteMessage, type ListStatus } from "@/components/resource/dialog-kit";

type CreateForm = {
  name: string; cuisineLabel: string; addressLine: string; city: string; phone: string;
  latitude: number; longitude: number; prepTimeMin: number; prepTimeMax: number;
  priceForTwo: number; seatingCapacity: number; maxPartySize: number;
};

const emptyForm: CreateForm = {
  name: "", cuisineLabel: "", addressLine: "", city: "", phone: "",
  latitude: 0, longitude: 0, prepTimeMin: 20, prepTimeMax: 35,
  priceForTwo: 300, seatingCapacity: 40, maxPartySize: 12,
};

export function RestaurantsPage({ embedded = false }: { embedded?: boolean }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const enterRestaurant = useAppStore((state) => state.enterRestaurant);
  const isSuperAdmin = useAppStore((state) => state.admin?.role === "SUPERADMIN");
  const selectedAdmin = useAppStore((state) => state.selectedAdmin);
  const exitAdminSelection = useAppStore((state) => state.exitAdminSelection);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [restaurantToDeactivate, setRestaurantToDeactivate] = useState<Restaurant | null>(null);
  const [restaurantToDelete, setRestaurantToDelete] = useState<Restaurant | null>(null);
  const [view, setView] = useState<ListStatus>("active");
  const [notice, setNotice] = useState("");

  const restaurants = useQuery({
    queryKey: ["admin-restaurants", search, selectedAdmin?.id ?? "self", view],
    queryFn: () =>
      api<{ restaurants: Restaurant[] }>(
        `/admin/restaurants?${new URLSearchParams({
          ...(search ? { search } : {}),
          ...(selectedAdmin ? { adminId: selectedAdmin.id } : {}),
          status: view === "active" ? "ACTIVE" : "INACTIVE",
          limit: "100",
        })}`,
      ),
  });

  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<CreateForm>({ defaultValues: emptyForm });

  const create = useMutation({
    mutationFn: (data: CreateForm) =>
      api<Restaurant>("/admin/restaurants", {
        method: "POST",
        body: cleanBody(selectedAdmin ? { ...data, adminId: selectedAdmin.id } : data),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-restaurants"] });
      reset(emptyForm);
      setDialogOpen(false);
    },
  });

  const deactivate = useMutation({
    mutationFn: (id: string) => api(`/admin/restaurants/${id}`, { method: "DELETE" }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin-restaurants"] }),
  });

  const activate = useMutation({
    mutationFn: (id: string) => api(`/admin/restaurants/${id}`, { method: "PATCH", body: { status: "ACTIVE" } }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin-restaurants"] }),
  });

  const remove = useMutation({
    mutationFn: (restaurant: Restaurant) => api<HardDeleteResult>(`/admin/restaurants/${restaurant.id}/permanent`, { method: "DELETE" }),
    onSuccess: (result, restaurant) => {
      setNotice(hardDeleteMessage(restaurant.name, result));
      setRestaurantToDelete(null);
      void queryClient.invalidateQueries({ queryKey: ["admin-restaurants"] });
    },
  });

  const enter = (restaurant: Restaurant) => {
    enterRestaurant({ id: restaurant.id, name: restaurant.name, banner: restaurant.banner });
    navigate("/");
  };

  return (
    <div className={embedded ? "" : "page"}>
      {!embedded && selectedAdmin && (
        <Button type="button" variant="ghost" onClick={() => { exitAdminSelection(); navigate("/"); }}>
          <ArrowLeft size={14} /> {t("restaurants.backToAdmins")}
        </Button>
      )}
      <section className="resource-head">
        <span className="eyebrow">
          <UtensilsCrossed size={14} /> {selectedAdmin ? t("restaurants.adminRestaurants", { name: selectedAdmin.name }) : t("restaurants.title")}
        </span>
        <Button type="button" onClick={() => { reset(emptyForm); setDialogOpen(true); }}><Plus size={17} /> {t("restaurants.add")}</Button>
      </section>

      <ResourceToolbar search={search} onSearchChange={setSearch} placeholder={t("restaurants.search")} />
      <StatusTabs value={view} onChange={setView} />
      {notice && <Notice message={notice} onClose={() => setNotice("")} />}

      {restaurants.isLoading && <LoadingGrid />}
      {restaurants.isError && <StateView title={t("restaurants.loadError")} message={t("common.loadErrorMessage")} action={() => void restaurants.refetch()} />}
      {restaurants.isSuccess && !restaurants.data.restaurants.length && view === "inactive" && (
        <StateView title={t("restaurants.noDeactivatedTitle")} message={t("restaurants.noDeactivatedMessage")} />
      )}
      {restaurants.isSuccess && !restaurants.data.restaurants.length && view === "active" && (
        <StateView
          title={t("restaurants.emptyTitle")}
          message={
            selectedAdmin
              ? t("restaurants.emptyForAdmin", { name: selectedAdmin.name })
              : isSuperAdmin
                ? t("restaurants.emptySuperAdmin")
                : t("restaurants.emptyAdmin")
          }
        />
      )}

      <div className="card-grid">
        {restaurants.data?.restaurants.map((restaurant) => (
          <button type="button" className={`card restaurant-picker-card${restaurant.status === "INACTIVE" ? " restaurant-picker-card--inactive" : ""}`} key={restaurant.id} onClick={() => enter(restaurant)}>
            {restaurant.banner ? <img src={resolveAssetUrl(restaurant.banner)} alt="" /> : <span className="restaurant-picker-card__placeholder"><UtensilsCrossed /></span>}
            <div className="restaurant-picker-card__body">
              <strong>{restaurant.name}</strong>
              <small>{restaurant.cuisineLabel}</small>
              <small className="muted"><MapPin size={12} /> {restaurant.city}</small>
            </div>
            <ArrowRight size={18} />
            {isSuperAdmin && (
              <span className="restaurant-picker-card__actions">
                {restaurant.status === "INACTIVE" ? (
                  <span role="button" tabIndex={0} className="icon-button" aria-label={t("restaurants.activateAria")} title={t("common.activate")}
                    onClick={(event) => { event.stopPropagation(); if (!activate.isPending) activate.mutate(restaurant.id); }}>
                    <RotateCcw size={14} />
                  </span>
                ) : (
                  <span role="button" tabIndex={0} className="icon-button" aria-label={t("restaurants.deactivateAria")} title={t("common.deactivate")}
                    onClick={(event) => { event.stopPropagation(); setRestaurantToDeactivate(restaurant); }}>
                    <Ban size={14} />
                  </span>
                )}
                <span role="button" tabIndex={0} className="icon-button icon-button--danger" aria-label={t("restaurants.deleteAria")} title={t("common.deletePermanently")}
                  onClick={(event) => { event.stopPropagation(); remove.reset(); setRestaurantToDelete(restaurant); }}>
                  <Trash2 size={14} />
                </span>
              </span>
            )}
          </button>
        ))}
      </div>

      {dialogOpen && (
        <ResourceDialog title={t("restaurants.add")} eyebrow={t("restaurants.newEyebrow")} onClose={() => setDialogOpen(false)}>
          <form noValidate onSubmit={handleSubmit((data) => create.mutate(data))}>
            <div className="property-form-grid">
              <label className="property-form-grid__wide"><span className="label-title">{t("restaurants.nameLabel")}<Req /></span>
                <input {...register("name", { required: t("common.nameRequired") })} />
                <FieldError error={errors.name} />
              </label>
              <label className="property-form-grid__wide"><span className="label-title">{t("restaurants.cuisineLabel")}<Req /></span>
                <input placeholder={t("restaurants.cuisinePlaceholder")} {...register("cuisineLabel", { required: t("restaurants.cuisineRequired") })} />
                <FieldError error={errors.cuisineLabel} />
              </label>
              <label className="property-form-grid__wide"><span className="label-title">{t("common.address")}<Req /></span>
                <input {...register("addressLine", { required: t("common.addressRequired") })} />
                <FieldError error={errors.addressLine} />
              </label>
              <label><span className="label-title">{t("common.city")}<Req /></span><input {...register("city", { required: t("common.cityRequired") })} /><FieldError error={errors.city} /></label>
              <label><span className="label-title">{t("common.phone")}<Req /></span><PhoneField control={control} name="phone" error={errors.phone} required /></label>
              <label><span className="label-title">{t("common.latitude")}<Req /></span><input type="number" step="0.0000001" {...register("latitude", { required: true, valueAsNumber: true })} /></label>
              <label><span className="label-title">{t("common.longitude")}<Req /></span><input type="number" step="0.0000001" {...register("longitude", { required: true, valueAsNumber: true })} /></label>
              <label>{t("restaurants.prepTimeMin")}<input type="number" {...register("prepTimeMin", { valueAsNumber: true })} /></label>
              <label>{t("restaurants.prepTimeMax")}<input type="number" {...register("prepTimeMax", { valueAsNumber: true })} /></label>
              <label>{t("restaurants.priceForTwo")}<input type="number" {...register("priceForTwo", { valueAsNumber: true })} /></label>
              <label>{t("restaurants.seatingCapacity")}<input type="number" {...register("seatingCapacity", { valueAsNumber: true })} /></label>
              <label>{t("restaurants.maxPartySize")}<input type="number" {...register("maxPartySize", { valueAsNumber: true })} /></label>
            </div>
            {create.error && <div className="form-error">{create.error.message}</div>}
            <DialogFooter onClose={() => setDialogOpen(false)} loading={create.isPending} label={t("restaurants.add")} />
          </form>
        </ResourceDialog>
      )}
      {restaurantToDeactivate && <ConfirmDialog title={t("restaurants.deactivateTitle")} message={t("restaurants.deactivateMessage", { name: restaurantToDeactivate.name })} loading={deactivate.isPending} onClose={() => setRestaurantToDeactivate(null)} onConfirm={() => deactivate.mutate(restaurantToDeactivate.id, { onSuccess: () => setRestaurantToDeactivate(null) })} />}
      {restaurantToDelete && <ConfirmDialog title={t("restaurants.deleteTitle")} message={t("restaurants.deleteMessage", { name: restaurantToDelete.name })} confirmLabel={t("common.deletePermanently")} danger loading={remove.isPending} error={remove.error?.message} onClose={() => setRestaurantToDelete(null)} onConfirm={() => remove.mutate(restaurantToDelete)} />}
    </div>
  );
}
