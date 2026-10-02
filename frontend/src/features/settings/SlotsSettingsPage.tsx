import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Clock, Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { queryClient } from "@/lib/query-client";
import { useAppStore } from "@/store/app-store";
import type { HardDeleteResult, SlotConfiguration, SlotMeal } from "@/types/domain";
import { Button } from "@/components/ui/Button";
import { LoadingGrid, StateView } from "@/components/ui/StateView";
import { ConfirmDialog, DialogFooter, FieldError, Notice, ResourceDialog, Req, StatusTabs, cleanBody, hardDeleteMessage, type ListStatus } from "@/components/resource/dialog-kit";

type SlotForm = { meal: SlotMeal; time: string; sortOrder: number; isActive: boolean };

const to24 = (value: string) => value; // <input type="time"> already gives "HH:mm"
const to12 = (time24: string) => {
  const [h, m] = time24.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
};
const from12to24 = (time12: string) => {
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(time12.trim());
  if (!match) return "12:00";
  let hour = Number(match[1]);
  const minute = match[2];
  const period = match[3]!.toUpperCase();
  if (period === "PM" && hour !== 12) hour += 12;
  if (period === "AM" && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${minute}`;
};

export function SlotsSettingsPage() {
  const { t } = useTranslation();
  const restaurantId = useAppStore((state) => state.activeRestaurant!.id);
  const base = `/admin/restaurants/${restaurantId}/slots`;
  const slots = useQuery({ queryKey: ["admin-slots", restaurantId], queryFn: () => api<SlotConfiguration[]>(base) });
  const [dialog, setDialog] = useState<SlotConfiguration | "new" | null>(null);
  const [slotToDelete, setSlotToDelete] = useState<SlotConfiguration | null>(null);
  const [view, setView] = useState<ListStatus>("active");
  const [notice, setNotice] = useState("");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-slots", restaurantId] });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<SlotForm>({
    defaultValues: { meal: "LUNCH", time: "12:00", sortOrder: 0 },
  });

  const save = useMutation({
    mutationFn: (data: SlotForm) => {
      const body = cleanBody({ meal: data.meal, time: to12(to24(data.time)), sortOrder: data.sortOrder, isActive: data.isActive });
      return dialog !== "new" && dialog
        ? api(`${base}/${dialog.id}`, { method: "PATCH", body })
        : api(base, { method: "POST", body });
    },
    onSuccess: async () => { await invalidate(); setDialog(null); },
  });

  const remove = useMutation({
    mutationFn: (slot: SlotConfiguration) => api<HardDeleteResult>(`${base}/${slot.id}/permanent`, { method: "DELETE" }),
    onSuccess: (result, slot) => { setNotice(hardDeleteMessage(t("slots.slotName", { time: slot.time }), result)); setSlotToDelete(null); void invalidate(); },
  });

  const openNew = () => { reset({ meal: "LUNCH", time: "12:00", sortOrder: slots.data?.length ?? 0, isActive: true }); setDialog("new"); };
  const openEdit = (slot: SlotConfiguration) => { reset({ meal: slot.meal, time: from12to24(slot.time), sortOrder: slot.sortOrder, isActive: slot.isActive }); setDialog(slot); };

  if (slots.isLoading) return <main className="page"><LoadingGrid /></main>;
  if (slots.isError) return <main className="page"><StateView title={t("slots.loadError")} message={t("common.loadErrorMessage")} action={() => void slots.refetch()} /></main>;

  const allSlots = slots.data ?? [];
  const inView = allSlots.filter((s) => (view === "active" ? s.isActive : !s.isActive));
  const lunch = inView.filter((s) => s.meal === "LUNCH").sort((a, b) => a.sortOrder - b.sortOrder);
  const dinner = inView.filter((s) => s.meal === "DINNER").sort((a, b) => a.sortOrder - b.sortOrder);

  const renderGroup = (meal: SlotMeal, items: SlotConfiguration[]) => (
    <section className="card">
      <header className="menu-category-card__head"><strong>{t(`slots.meals.${meal}`)}</strong></header>
      <div className="slot-chip-list">
        {items.map((slot) => (
          <div key={slot.id} className={`slot-chip ${slot.isActive ? "" : "slot-chip--inactive"}`}>
            <Clock size={13} /> {slot.time}
            <button type="button" className="icon-button" aria-label={t("slots.editAria")} onClick={() => openEdit(slot)}><Pencil size={13} /></button>
            <button type="button" className="icon-button icon-button--danger" aria-label={t("slots.deleteAria")} title={t("common.deletePermanently")} onClick={() => { remove.reset(); setSlotToDelete(slot); }}><Trash2 size={13} /></button>
          </div>
        ))}
        {!items.length && <small className="muted">{t(view === "active" ? "slots.noneConfigured" : "slots.noneDeactivated", { meal: t(`slots.meals.${meal}`) })}</small>}
      </div>
    </section>
  );

  return (
    <main className="page">
      <section className="resource-head">
        <span className="eyebrow"><Clock size={14} /> {t("slots.title")}</span>
        <Button type="button" onClick={openNew}><Plus size={17} /> {t("slots.add")}</Button>
      </section>
      <StatusTabs value={view} onChange={setView} activeCount={allSlots.filter((s) => s.isActive).length} inactiveCount={allSlots.filter((s) => !s.isActive).length} />
      {notice && <Notice message={notice} onClose={() => setNotice("")} />}
      {renderGroup("LUNCH", lunch)}
      {renderGroup("DINNER", dinner)}

      {dialog && (
        <ResourceDialog title={dialog === "new" ? t("slots.add") : t("slots.edit")} eyebrow={t("slots.eyebrow")} onClose={() => setDialog(null)}>
          <form noValidate onSubmit={handleSubmit((data) => save.mutate(data))}>
            <div className="property-form-grid">
              <label><span className="label-title">{t("slots.meal")}<Req /></span>
                <select {...register("meal", { required: true })}><option value="LUNCH">{t("slots.meals.LUNCH")}</option><option value="DINNER">{t("slots.meals.DINNER")}</option></select>
              </label>
              <label><span className="label-title">{t("slots.time")}<Req /></span>
                <input type="time" {...register("time", { required: t("slots.timeRequired") })} />
                <FieldError error={errors.time} />
              </label>
              <label>{t("common.sortOrder")}<input type="number" {...register("sortOrder", { valueAsNumber: true })} /></label>
              <label className="check-option"><input type="checkbox" {...register("isActive")} /><span>{t("common.active")}</span></label>
            </div>
            {save.error && <div className="form-error">{save.error.message}</div>}
            <DialogFooter onClose={() => setDialog(null)} loading={save.isPending} label={dialog === "new" ? t("slots.add") : t("common.saveChanges")} />
          </form>
        </ResourceDialog>
      )}
      {slotToDelete && <ConfirmDialog title={t("slots.deleteTitle")} message={t("slots.deleteMessage", { time: slotToDelete.time, meal: t(`slots.meals.${slotToDelete.meal}`) })} confirmLabel={t("common.deletePermanently")} danger loading={remove.isPending} error={remove.error?.message} onClose={() => setSlotToDelete(null)} onConfirm={() => remove.mutate(slotToDelete)} />}
    </main>
  );
}
