import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api-client";
import { queryClient } from "@/lib/query-client";
import { useAppStore } from "@/store/app-store";
import type { Restaurant, RestaurantCategory } from "@/types/domain";
import { Button } from "@/components/ui/Button";
import { LoadingGrid, StateView } from "@/components/ui/StateView";
import { CheckboxList, FieldError, ImageManager, PhoneField, Req, cleanBody, normalizeCover } from "@/components/resource/dialog-kit";
import { TranslationsEditor } from "@/components/resource/TranslationsEditor";
import type { Translations } from "@/i18n/content-languages";

type GeneralForm = {
  name: string;
  cuisineLabel: string;
  isPureVeg: boolean;
  prepTimeMin: number;
  prepTimeMax: number;
  priceForTwo: number;
  offerText: string;
  offerSubText: string;
  about: string;
  addressLine: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  latitude: number;
  longitude: number;
  phone: string;
  seatingCapacity: number;
  maxPartySize: number;
  opensAt: string;
  closesAt: string;
};

const emptyForm: GeneralForm = {
  name: "", cuisineLabel: "", isPureVeg: false, prepTimeMin: 20, prepTimeMax: 35,
  priceForTwo: 0, offerText: "", offerSubText: "", about: "", addressLine: "",
  city: "", state: "", country: "India", pincode: "", latitude: 0, longitude: 0,
  phone: "", seatingCapacity: 40, maxPartySize: 12, opensAt: "09:00", closesAt: "23:00",
};

export function GeneralSettingsPage() {
  const { t } = useTranslation();
  const restaurantId = useAppStore((state) => state.activeRestaurant!.id);
  const enterRestaurant = useAppStore((state) => state.enterRestaurant);
  const restaurant = useQuery({ queryKey: ["admin-restaurant", restaurantId], queryFn: () => api<Restaurant>(`/admin/restaurants/${restaurantId}`) });
  const categories = useQuery({ queryKey: ["restaurant-categories"], queryFn: () => api<RestaurantCategory[]>("/admin/categories") });
  const [banner, setBanner] = useState<{ imageUrl: string; sortOrder: number }[]>([]);
  const [gallery, setGallery] = useState<{ imageUrl: string; sortOrder: number }[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [translations, setTranslations] = useState<Translations>({});
  const [saved, setSaved] = useState(false);
  const { register, control, handleSubmit, reset, watch, formState: { errors } } = useForm<GeneralForm>({ defaultValues: emptyForm });
  const english = watch();

  useEffect(() => {
    if (!restaurant.data) return;
    const r = restaurant.data;
    reset({
      name: r.name, cuisineLabel: r.cuisineLabel, isPureVeg: r.isPureVeg,
      prepTimeMin: r.prepTimeMin, prepTimeMax: r.prepTimeMax, priceForTwo: r.priceForTwo,
      offerText: r.offerText ?? "", offerSubText: r.offerSubText ?? "", about: r.about ?? "",
      addressLine: r.addressLine ?? r.address?.line ?? "",
      city: r.city ?? r.address?.city ?? "",
      state: r.state ?? r.address?.state ?? "",
      country: r.country ?? r.address?.country ?? "India",
      pincode: r.pincode ?? r.address?.pincode ?? "",
      latitude: r.latitude, longitude: r.longitude, phone: r.phone,
      seatingCapacity: r.seatingCapacity ?? 40, maxPartySize: r.maxPartySize,
      opensAt: r.opensAt ?? "09:00", closesAt: r.closesAt ?? "23:00",
    });
    setBanner(r.banner ? [{ imageUrl: r.banner, sortOrder: 0 }] : []);
    setGallery(r.gallery.map((imageUrl, sortOrder) => ({ imageUrl, sortOrder })));
    setTranslations(r.translations ?? {});
  }, [restaurant.data, reset]);

  useEffect(() => {
    if (!restaurant.data || !categories.data) return;
    const keySet = new Set(restaurant.data.categories);
    setSelectedCategoryIds(categories.data.filter((category) => keySet.has(category.key)).map((category) => category.id));
  }, [restaurant.data, categories.data]);

  const mutation = useMutation({
    mutationFn: (data: GeneralForm) =>
      api<Restaurant>(`/admin/restaurants/${restaurantId}`, {
        method: "PATCH",
        body: cleanBody({
          ...data,
          banner: banner[0]?.imageUrl,
          gallery: gallery.map((image) => image.imageUrl),
          categoryIds: selectedCategoryIds,
          translations,
        }),
      }),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ["admin-restaurant", restaurantId] });
      await queryClient.invalidateQueries({ queryKey: ["admin-restaurants"] });
      enterRestaurant({ id: updated.id, name: updated.name, banner: updated.banner });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  if (restaurant.isLoading) return <LoadingGrid />;
  if (restaurant.isError) return <StateView title={t("general.loadError")} message={t("common.loadErrorMessage")} action={() => void restaurant.refetch()} />;

  return (
    <form className="settings-form" noValidate onSubmit={handleSubmit((data) => mutation.mutate(data))}>
      <div className="property-form-grid">
        <div className="property-form-grid__wide">
          <span className="label-title">{t("general.banner")}</span>
          <ImageManager images={banner} onChange={(next) => setBanner(next.slice(-1).map((image, sortOrder) => ({ imageUrl: image.imageUrl, sortOrder })))} />
        </div>
        <div className="property-form-grid__wide">
          <span className="label-title">{t("general.gallery")}</span>
          <ImageManager images={gallery} onChange={(next) => setGallery(normalizeCover(next, false))} />
        </div>
        <label><span className="label-title">{t("restaurants.nameLabel")}<Req /></span>
          <input {...register("name", { required: t("general.nameRequired"), minLength: { value: 2, message: t("general.nameMinLength") } })} />
          <FieldError error={errors.name} />
        </label>
        <label><span className="label-title">{t("restaurants.cuisineLabel")}<Req /></span>
          <input placeholder={t("general.cuisinePlaceholder")} {...register("cuisineLabel", { required: t("restaurants.cuisineRequired") })} />
          <FieldError error={errors.cuisineLabel} />
        </label>
        <label className="check-option"><input type="checkbox" {...register("isPureVeg")} /><span>{t("general.pureVeg")}</span></label>
        {categories.data && (
          <CheckboxList title={t("general.categories")} items={categories.data.map((c) => ({ id: c.id, label: c.label }))} selected={selectedCategoryIds} onChange={setSelectedCategoryIds} />
        )}
        <label className="property-form-grid__wide">{t("general.about")}<textarea rows={3} {...register("about")} /></label>
        <label><span className="label-title">{t("general.prepTimeMin")}<Req /></span><input type="number" min={0} {...register("prepTimeMin", { required: true, valueAsNumber: true })} /></label>
        <label><span className="label-title">{t("general.prepTimeMax")}<Req /></span><input type="number" min={0} {...register("prepTimeMax", { required: true, valueAsNumber: true })} /></label>
        <label><span className="label-title">{t("restaurants.priceForTwo")}<Req /></span><input type="number" min={0} {...register("priceForTwo", { required: true, valueAsNumber: true })} /></label>
        <label>{t("general.offerText")}<input placeholder={t("general.offerTextPlaceholder")} {...register("offerText")} /></label>
        <label>{t("general.offerSubText")}<input placeholder={t("general.offerSubTextPlaceholder")} {...register("offerSubText")} /></label>
        <label className="property-form-grid__wide"><span className="label-title">{t("common.address")}<Req /></span>
          <input {...register("addressLine", { required: t("common.addressRequired") })} />
          <FieldError error={errors.addressLine} />
        </label>
        <label><span className="label-title">{t("common.city")}<Req /></span><input {...register("city", { required: t("common.cityRequired") })} /><FieldError error={errors.city} /></label>
        <label>{t("general.state")}<input {...register("state")} /></label>
        <label><span className="label-title">{t("general.country")}<Req /></span><input {...register("country", { required: t("general.countryRequired") })} /></label>
        <label>{t("general.pincode")}<input {...register("pincode")} /></label>
        <label><span className="label-title">{t("common.latitude")}<Req /></span><input type="number" step="0.0000001" {...register("latitude", { required: true, valueAsNumber: true, min: -90, max: 90 })} /></label>
        <label><span className="label-title">{t("common.longitude")}<Req /></span><input type="number" step="0.0000001" {...register("longitude", { required: true, valueAsNumber: true, min: -180, max: 180 })} /></label>
        <label><span className="label-title">{t("common.phone")}<Req /></span><PhoneField control={control} name="phone" error={errors.phone} required /></label>
        <label><span className="label-title">{t("restaurants.seatingCapacity")}<Req /></span><input type="number" min={1} {...register("seatingCapacity", { required: true, valueAsNumber: true })} /></label>
        <label><span className="label-title">{t("restaurants.maxPartySize")}<Req /></span><input type="number" min={1} {...register("maxPartySize", { required: true, valueAsNumber: true })} /></label>
        <label><span className="label-title">{t("general.opensAt")}<Req /></span><input type="time" {...register("opensAt", { required: t("general.opensAtRequired") })} /><FieldError error={errors.opensAt} /></label>
        <label><span className="label-title">{t("general.closesAt")}<Req /></span>
          <input type="time" {...register("closesAt", { required: t("general.closesAtRequired"), validate: (value, form) => value > form.opensAt || t("general.closesAfterOpens") })} />
          <FieldError error={errors.closesAt} />
          <small className="muted">{t("general.openingHoursHint")}</small>
        </label>
        <TranslationsEditor
          value={translations}
          onChange={setTranslations}
          fields={[
            { key: "name", label: t("restaurants.nameLabel"), source: english.name },
            { key: "cuisineLabel", label: t("restaurants.cuisineLabel"), source: english.cuisineLabel },
            { key: "about", label: t("general.about"), source: english.about, multiline: true },
            { key: "offerText", label: t("general.offerText"), source: english.offerText },
            { key: "offerSubText", label: t("general.offerSubText"), source: english.offerSubText },
            { key: "addressLine", label: t("common.address"), source: english.addressLine, multiline: true },
            { key: "city", label: t("common.city"), source: english.city },
            { key: "state", label: t("general.state"), source: english.state },
          ]}
        />
      </div>
      {mutation.error && <div className="form-error">{mutation.error.message}</div>}
      <footer className="settings-form__footer">
        {saved && <span className="settings-saved">{t("common.saved")}</span>}
        <Button type="submit" loading={mutation.isPending}><Save size={17} /> {t("common.saveChanges")}</Button>
      </footer>
    </form>
  );
}
