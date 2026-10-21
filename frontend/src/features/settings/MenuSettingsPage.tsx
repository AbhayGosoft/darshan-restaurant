import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { LeafyGreen, Pencil, Plus, Trash2, UtensilsCrossed } from "lucide-react";
import { clsx } from "clsx";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api-client";
import { queryClient } from "@/lib/query-client";
import { useAppStore } from "@/store/app-store";
import type { HardDeleteResult, MenuCategory, MenuItem } from "@/types/domain";
import { Button } from "@/components/ui/Button";
import { LoadingGrid, StateView } from "@/components/ui/StateView";
import { ConfirmDialog, DialogFooter, FieldError, ImageManager, Notice, ResourceDialog, Req, StatusTabs, cleanBody, hardDeleteMessage, type ListStatus } from "@/components/resource/dialog-kit";
import { TranslationsEditor } from "@/components/resource/TranslationsEditor";
import type { Translations } from "@/i18n/content-languages";

type CategoryForm = { name: string; sortOrder: number; isActive: boolean };
type ItemForm = { name: string; description: string; price: number; isVeg: boolean; isActive: boolean; sortOrder: number };

export function MenuSettingsPage() {
  const { t } = useTranslation();
  const restaurantId = useAppStore((state) => state.activeRestaurant!.id);
  const base = `/admin/restaurants/${restaurantId}/menu`;
  const categories = useQuery({ queryKey: ["menu-categories", restaurantId], queryFn: () => api<MenuCategory[]>(`${base}/categories`) });

  const [categoryDialog, setCategoryDialog] = useState<MenuCategory | null | "new">(null);
  const [itemDialog, setItemDialog] = useState<{ categoryId: string; item: MenuItem | null } | null>(null);
  const [itemImage, setItemImage] = useState<{ imageUrl: string; sortOrder: number }[]>([]);
  const [categoryTranslations, setCategoryTranslations] = useState<Translations>({});
  const [itemTranslations, setItemTranslations] = useState<Translations>({});
  const [deleteTarget, setDeleteTarget] = useState<{ type: "category" | "item"; id: string; name: string } | null>(null);
  const [view, setView] = useState<ListStatus>("active");
  const [notice, setNotice] = useState("");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["menu-categories", restaurantId] });

  const saveCategory = useMutation({
    mutationFn: (data: CategoryForm) =>
      categoryDialog !== "new" && categoryDialog
        ? api(`${base}/categories/${categoryDialog.id}`, { method: "PATCH", body: cleanBody({ ...data, translations: categoryTranslations }) })
        : api(`${base}/categories`, { method: "POST", body: cleanBody({ ...data, translations: categoryTranslations }) }),
    onSuccess: async () => { await invalidate(); setCategoryDialog(null); },
  });

  const saveItem = useMutation({
    mutationFn: (data: ItemForm) => {
      const body = cleanBody({ ...data, image: itemImage[0]?.imageUrl, translations: itemTranslations });
      return itemDialog?.item
        ? api(`${base}/items/${itemDialog.item.id}`, { method: "PATCH", body })
        : api(`${base}/categories/${itemDialog!.categoryId}/items`, { method: "POST", body });
    },
    onSuccess: async () => { await invalidate(); setItemDialog(null); },
  });

  const remove = useMutation({
    mutationFn: (target: { type: "category" | "item"; id: string; name: string }) =>
      api<HardDeleteResult>(target.type === "category" ? `${base}/categories/${target.id}/permanent` : `${base}/items/${target.id}/permanent`, { method: "DELETE" }),
    onSuccess: (result, target) => { setNotice(hardDeleteMessage(target.name, result)); setDeleteTarget(null); void invalidate(); },
  });

  const categoryForm = useForm<CategoryForm>({ defaultValues: { name: categoryDialog !== "new" && categoryDialog ? categoryDialog.name : "", sortOrder: categoryDialog !== "new" && categoryDialog ? categoryDialog.sortOrder : (categories.data?.length ?? 0), isActive: categoryDialog !== "new" && categoryDialog ? categoryDialog.isActive : true } });
  const itemForm = useForm<ItemForm>({
    defaultValues: {
      name: itemDialog?.item?.name ?? "",
      description: itemDialog?.item?.description ?? "",
      price: itemDialog?.item?.price ?? 0,
      isVeg: itemDialog?.item?.isVeg ?? true,
      isActive: itemDialog?.item?.isActive ?? true,
      sortOrder: itemDialog?.item?.sortOrder ?? 0,
    },
  });

  if (categories.isLoading) return <main className="page"><LoadingGrid /></main>;
  if (categories.isError) return <main className="page"><StateView title={t("menu.loadError")} message={t("common.loadErrorMessage")} action={() => void categories.refetch()} /></main>;

  const allCategories = categories.data ?? [];
  const activeCategories = allCategories.filter((category) => category.isActive);
  const inactiveCategories = allCategories.filter((category) => !category.isActive);
  // Deactivated items inside still-active categories; items of a deactivated category are shown with that category.
  const inactiveItems = activeCategories.flatMap((category) => category.items.filter((item) => !item.isActive).map((item) => ({ category, item })));

  const renderCategoryActions = (category: MenuCategory) => (
    <>
      <button type="button" className="icon-button" aria-label={t("menu.editCategory")} onClick={() => { categoryForm.reset({ name: category.name, sortOrder: category.sortOrder, isActive: category.isActive }); setCategoryTranslations(category.translations ?? {}); setCategoryDialog(category); }}><Pencil size={15} /></button>
      <button type="button" className="icon-button icon-button--danger" aria-label={t("menu.deleteCategoryAria")} title={t("common.deletePermanently")} onClick={() => { remove.reset(); setDeleteTarget({ type: "category", id: category.id, name: category.name }); }}><Trash2 size={15} /></button>
    </>
  );

  const renderItemRow = (category: MenuCategory, item: MenuItem, showCategory = false) => (
    <div className="menu-item-row" key={item.id}>
      {item.image ? <img src={item.image} alt="" className="menu-item-row__image" /> : <span className="menu-item-row__image menu-item-row__image--empty"><UtensilsCrossed size={16} /></span>}
      <div className="menu-item-row__body">
        <strong>{item.name} <LeafyGreen size={13} className={clsx("veg-dot", item.isVeg ? "veg-dot--veg" : "veg-dot--nonveg")} /></strong>
        <small>{showCategory ? category.name : item.description}</small>
      </div>
      <span className="menu-item-row__price">₹{item.price}</span>
      <button type="button" className="icon-button" aria-label={t("menu.editItem")} onClick={() => { itemForm.reset({ name: item.name, description: item.description ?? "", price: item.price, isVeg: item.isVeg, isActive: item.isActive, sortOrder: item.sortOrder }); setItemImage(item.image ? [{ imageUrl: item.image, sortOrder: 0 }] : []); setItemTranslations(item.translations ?? {}); setItemDialog({ categoryId: category.id, item }); }}><Pencil size={14} /></button>
      <button type="button" className="icon-button icon-button--danger" aria-label={t("menu.deleteItemAria")} title={t("common.deletePermanently")} onClick={() => { remove.reset(); setDeleteTarget({ type: "item", id: item.id, name: item.name }); }}><Trash2 size={14} /></button>
    </div>
  );

  return (
    <main className="page">
      <section className="resource-head">
        <span className="eyebrow"><UtensilsCrossed size={14} /> {t("menu.title")}</span>
        <Button type="button" onClick={() => { categoryForm.reset({ name: "", sortOrder: categories.data?.length ?? 0, isActive: true }); setCategoryTranslations({}); setCategoryDialog("new"); }}><Plus size={17} /> {t("menu.addCategory")}</Button>
      </section>

      <StatusTabs value={view} onChange={setView} activeCount={activeCategories.length} inactiveCount={inactiveCategories.length + inactiveItems.length} />
      {notice && <Notice message={notice} onClose={() => setNotice("")} />}

      {view === "active" && (
        <>
          {!activeCategories.length && <StateView title={t("menu.emptyTitle")} message={t("menu.emptyMessage")} />}
          <div className="menu-category-list">
            {activeCategories.map((category) => {
              const items = category.items.filter((item) => item.isActive);
              return (
                <section className="card menu-category-card" key={category.id}>
                  <header className="menu-category-card__head">
                    <div><strong>{category.name}</strong></div>
                    <div className="menu-category-card__actions">
                      {renderCategoryActions(category)}
                      <Button type="button" variant="secondary" onClick={() => { itemForm.reset({ name: "", description: "", price: 0, isVeg: true, isActive: true, sortOrder: category.items.length }); setItemImage([]); setItemTranslations({}); setItemDialog({ categoryId: category.id, item: null }); }}><Plus size={15} /> {t("menu.addItem")}</Button>
                    </div>
                  </header>
                  <div className="menu-item-list">
                    {items.map((item) => renderItemRow(category, item))}
                    {!items.length && <small className="muted">{t("menu.noActiveItems")}</small>}
                  </div>
                </section>
              );
            })}
          </div>
        </>
      )}

      {view === "inactive" && (
        <>
          {!inactiveCategories.length && !inactiveItems.length && <StateView title={t("menu.nothingDeactivatedTitle")} message={t("menu.nothingDeactivatedMessage")} />}
          {inactiveCategories.length > 0 && <h3 className="inactive-section-title">{t("menu.deactivatedCategories")}</h3>}
          <div className="menu-category-list">
            {inactiveCategories.map((category) => (
              <section className="card menu-category-card" key={category.id}>
                <header className="menu-category-card__head">
                  <div><strong>{category.name}</strong> <span className="badge badge--muted">{t("common.inactive")}</span></div>
                  <div className="menu-category-card__actions">{renderCategoryActions(category)}</div>
                </header>
                <div className="menu-item-list">
                  {category.items.map((item) => renderItemRow(category, item))}
                  {!category.items.length && <small className="muted">{t("menu.noItems")}</small>}
                </div>
              </section>
            ))}
          </div>
          {inactiveItems.length > 0 && (
            <>
              <h3 className="inactive-section-title">{t("menu.deactivatedItems")}</h3>
              <section className="card menu-category-card">
                <div className="menu-item-list">
                  {inactiveItems.map(({ category, item }) => renderItemRow(category, item, true))}
                </div>
              </section>
            </>
          )}
        </>
      )}

      {categoryDialog && (
        <ResourceDialog title={categoryDialog === "new" ? t("menu.addCategory") : t("menu.editCategory")} eyebrow={t("menu.categoryEyebrow")} onClose={() => setCategoryDialog(null)}>
          <form noValidate onSubmit={categoryForm.handleSubmit((data) => saveCategory.mutate(data))}>
            <div className="property-form-grid">
              <label className="property-form-grid__wide"><span className="label-title">{t("menu.categoryName")}<Req /></span>
                <input {...categoryForm.register("name", { required: t("menu.categoryNameRequired") })} />
                <FieldError error={categoryForm.formState.errors.name} />
              </label>
              <label>{t("common.sortOrder")}<input type="number" {...categoryForm.register("sortOrder", { valueAsNumber: true })} /></label>
              <label className="check-option"><input type="checkbox" {...categoryForm.register("isActive")} /><span>{t("common.active")}</span></label>
              <TranslationsEditor value={categoryTranslations} onChange={setCategoryTranslations} fields={[{ key: "name", label: t("menu.categoryName"), source: categoryForm.watch("name") }]} />
            </div>
            {saveCategory.error && <div className="form-error">{saveCategory.error.message}</div>}
            <DialogFooter onClose={() => setCategoryDialog(null)} loading={saveCategory.isPending} label={categoryDialog === "new" ? t("menu.addCategory") : t("common.saveChanges")} />
          </form>
        </ResourceDialog>
      )}

      {itemDialog && (
        <ResourceDialog title={itemDialog.item ? t("menu.editItem") : t("menu.addItem")} eyebrow={t("menu.itemEyebrow")} onClose={() => setItemDialog(null)}>
          <form noValidate onSubmit={itemForm.handleSubmit((data) => saveItem.mutate(data))}>
            <div className="property-form-grid">
              <div className="property-form-grid__wide"><ImageManager images={itemImage} onChange={(next) => setItemImage(next.slice(-1).map((image, sortOrder) => ({ imageUrl: image.imageUrl, sortOrder })))} /></div>
              <label className="property-form-grid__wide"><span className="label-title">{t("menu.itemName")}<Req /></span>
                <input {...itemForm.register("name", { required: t("menu.itemNameRequired") })} />
                <FieldError error={itemForm.formState.errors.name} />
              </label>
              <label className="property-form-grid__wide">{t("menu.description")}<textarea rows={2} {...itemForm.register("description")} /></label>
              <label><span className="label-title">{t("menu.price")}<Req /></span><input type="number" min={0} step="0.01" {...itemForm.register("price", { required: true, valueAsNumber: true })} /></label>
              <label>{t("common.sortOrder")}<input type="number" {...itemForm.register("sortOrder", { valueAsNumber: true })} /></label>
              <label className="check-option"><input type="checkbox" {...itemForm.register("isVeg")} /><span>{t("menu.vegetarian")}</span></label>
              <label className="check-option"><input type="checkbox" {...itemForm.register("isActive")} /><span>{t("common.active")}</span></label>
              <TranslationsEditor
                value={itemTranslations}
                onChange={setItemTranslations}
                fields={[
                  { key: "name", label: t("menu.itemName"), source: itemForm.watch("name") },
                  { key: "description", label: t("menu.description"), source: itemForm.watch("description"), multiline: true },
                ]}
              />
            </div>
            {saveItem.error && <div className="form-error">{saveItem.error.message}</div>}
            <DialogFooter onClose={() => setItemDialog(null)} loading={saveItem.isPending} label={itemDialog.item ? t("common.saveChanges") : t("menu.addItem")} />
          </form>
        </ResourceDialog>
      )}
      {deleteTarget && <ConfirmDialog title={deleteTarget.type === "category" ? t("menu.deleteCategoryTitle") : t("menu.deleteItemTitle")} message={t(deleteTarget.type === "category" ? "menu.deleteCategoryMessage" : "menu.deleteItemMessage", { name: deleteTarget.name })} confirmLabel={t("common.deletePermanently")} danger loading={remove.isPending} error={remove.error?.message} onClose={() => setDeleteTarget(null)} onConfirm={() => remove.mutate(deleteTarget)} />}
    </main>
  );
}
