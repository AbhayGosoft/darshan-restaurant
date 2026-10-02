import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Pencil, Plus, Tags, Trash2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { queryClient } from "@/lib/query-client";
import type { HardDeleteResult, RestaurantCategory } from "@/types/domain";
import { Button } from "@/components/ui/Button";
import { LoadingGrid, StateView } from "@/components/ui/StateView";
import { ConfirmDialog, DialogFooter, FieldError, Notice, ResourceDialog, Req, StatusTabs, cleanBody, hardDeleteMessage, type ListStatus } from "@/components/resource/dialog-kit";

type CategoryForm = { label: string; sortOrder: number; isActive: boolean };

export function CategoriesSettingsPage() {
  const { t } = useTranslation();
  const categories = useQuery({ queryKey: ["restaurant-categories"], queryFn: () => api<RestaurantCategory[]>("/admin/categories") });
  const [dialog, setDialog] = useState<RestaurantCategory | "new" | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<RestaurantCategory | null>(null);
  const [view, setView] = useState<ListStatus>("active");
  const [notice, setNotice] = useState("");

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CategoryForm>({ defaultValues: { label: "", sortOrder: 0, isActive: true } });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["restaurant-categories"] });

  const save = useMutation({
    mutationFn: (data: CategoryForm) =>
      dialog !== "new" && dialog
        ? api(`/admin/categories/${dialog.id}`, { method: "PATCH", body: cleanBody(data) })
        : api("/admin/categories", { method: "POST", body: cleanBody(data) }),
    onSuccess: async () => { await invalidate(); setDialog(null); },
  });

  const remove = useMutation({
    mutationFn: (category: RestaurantCategory) => api<HardDeleteResult>(`/admin/categories/${category.id}/permanent`, { method: "DELETE" }),
    onSuccess: (result, category) => { setNotice(hardDeleteMessage(category.label, result)); setCategoryToDelete(null); void invalidate(); },
  });

  const openNew = () => { reset({ label: "", sortOrder: categories.data?.length ?? 0, isActive: true }); setDialog("new"); };
  const openEdit = (category: RestaurantCategory) => { reset({ label: category.label, sortOrder: category.sortOrder, isActive: category.isActive }); setDialog(category); };

  if (categories.isLoading) return <LoadingGrid />;
  if (categories.isError) return <StateView title={t("categories.loadError")} message={t("common.loadErrorMessage")} action={() => void categories.refetch()} />;

  const active = (categories.data ?? []).filter((category) => category.isActive);
  const inactive = (categories.data ?? []).filter((category) => !category.isActive);
  const visible = view === "active" ? active : inactive;

  return (
    <div>
      <section className="resource-head">
        <span className="eyebrow"><Tags size={14} /> {t("categories.title")}</span>
        <Button type="button" onClick={openNew}><Plus size={17} /> {t("categories.add")}</Button>
      </section>
      <StatusTabs value={view} onChange={setView} activeCount={active.length} inactiveCount={inactive.length} />
      {notice && <Notice message={notice} onClose={() => setNotice("")} />}
      <div className="card-grid">
        {visible.map((category) => (
          <div className="card" key={category.id}>
            <div className="menu-category-card__head">
              <div><strong>{category.label}</strong> <small className="muted">({category.key})</small></div>
              <div className="menu-category-card__actions">
                <button type="button" className="icon-button" aria-label={t("categories.editAria")} onClick={() => openEdit(category)}><Pencil size={15} /></button>
                <button type="button" className="icon-button icon-button--danger" aria-label={t("categories.deleteAria")} title={t("common.deletePermanently")} onClick={() => { remove.reset(); setCategoryToDelete(category); }}><Trash2 size={15} /></button>
              </div>
            </div>
          </div>
        ))}
        {!visible.length && (view === "active"
          ? <StateView title={t("categories.noActiveTitle")} message={t("categories.noActiveMessage")} />
          : <StateView title={t("categories.noDeactivatedTitle")} message={t("categories.noDeactivatedMessage")} />)}
      </div>

      {dialog && (
        <ResourceDialog title={dialog === "new" ? t("categories.add") : t("categories.edit")} eyebrow={t("categories.eyebrow")} onClose={() => setDialog(null)}>
          <form noValidate onSubmit={handleSubmit((data) => save.mutate(data))}>
            <div className="property-form-grid">
              <label className="property-form-grid__wide"><span className="label-title">{t("categories.label")}<Req /></span>
                <input placeholder={t("categories.labelPlaceholder")} {...register("label", { required: t("categories.labelRequired") })} />
                <FieldError error={errors.label} />
              </label>
              <label>{t("common.sortOrder")}<input type="number" {...register("sortOrder", { valueAsNumber: true })} /></label>
              <label className="check-option"><input type="checkbox" {...register("isActive")} /><span>{t("common.active")}</span></label>
            </div>
            {save.error && <div className="form-error">{save.error.message}</div>}
            <DialogFooter onClose={() => setDialog(null)} loading={save.isPending} label={dialog === "new" ? t("categories.add") : t("common.saveChanges")} />
          </form>
        </ResourceDialog>
      )}
      {categoryToDelete && <ConfirmDialog title={t("categories.deleteTitle")} message={t("categories.deleteMessage", { name: categoryToDelete.label })} confirmLabel={t("common.deletePermanently")} danger loading={remove.isPending} error={remove.error?.message} onClose={() => setCategoryToDelete(null)} onConfirm={() => remove.mutate(categoryToDelete)} />}
    </div>
  );
}
