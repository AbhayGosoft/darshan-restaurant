import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowRight, Pencil, Plus, ShieldCheck, Trash2, UserCog } from "lucide-react";
import { api } from "@/lib/api-client";
import { queryClient } from "@/lib/query-client";
import { useAppStore } from "@/store/app-store";
import type { AdminUser, HardDeleteResult, Restaurant } from "@/types/domain";
import { Button } from "@/components/ui/Button";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { LoadingGrid, StateView } from "@/components/ui/StateView";
import { CheckboxList, ConfirmDialog, DialogFooter, FieldError, Notice, ResourceDialog, Req, StatusTabs, cleanBody, hardDeleteMessage, type ListStatus } from "@/components/resource/dialog-kit";

type AdminForm = { name: string; email: string; password: string; role: "ADMIN" | "SUPERADMIN"; isActive: boolean };

export function AdminsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const selectAdmin = useAppStore((state) => state.selectAdmin);
  const admins = useQuery({ queryKey: ["admins"], queryFn: () => api<AdminUser[]>("/admin/admins") });
  const restaurants = useQuery({ queryKey: ["admin-restaurants", ""], queryFn: () => api<{ restaurants: Restaurant[] }>("/admin/restaurants?limit=200") });
  const [dialog, setDialog] = useState<AdminUser | "new" | null>(null);
  const [selectedRestaurantIds, setSelectedRestaurantIds] = useState<string[]>([]);
  const [adminToDelete, setAdminToDelete] = useState<AdminUser | null>(null);
  const [view, setView] = useState<ListStatus>("active");
  const [notice, setNotice] = useState("");

  const { register, handleSubmit, reset, formState: { errors } } = useForm<AdminForm>({ defaultValues: { name: "", email: "", password: "", role: "ADMIN", isActive: true } });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admins"] });

  const save = useMutation({
    mutationFn: (data: AdminForm) => {
      const { isActive, ...rest } = data;
      const body = cleanBody({ ...rest, status: isActive ? "ACTIVE" : "INACTIVE", restaurantIds: selectedRestaurantIds });
      return dialog !== "new" && dialog
        ? api(`/admin/admins/${dialog.id}`, { method: "PATCH", body })
        : api("/admin/admins", { method: "POST", body });
    },
    onSuccess: async () => { await invalidate(); setDialog(null); },
  });

  const remove = useMutation({
    mutationFn: (admin: AdminUser) => api<HardDeleteResult>(`/admin/admins/${admin.id}/permanent`, { method: "DELETE" }),
    onSuccess: (result, admin) => { setNotice(hardDeleteMessage(admin.name, result)); setAdminToDelete(null); void invalidate(); },
  });

  const openNew = () => { reset({ name: "", email: "", password: "", role: "ADMIN", isActive: true }); setSelectedRestaurantIds([]); setDialog("new"); };
  const openEdit = (admin: AdminUser) => {
    reset({ name: admin.name, email: admin.email, password: "", role: admin.role, isActive: admin.status === "ACTIVE" });
    setSelectedRestaurantIds((admin.restaurants ?? []).map((r) => r.restaurant.id));
    setDialog(admin);
  };

  const enter = (admin: AdminUser) => {
    if (admin.role !== "ADMIN") return;
    selectAdmin({ id: admin.id, name: admin.name });
    navigate("/");
  };

  if (admins.isLoading) return <main className="page"><LoadingGrid /></main>;
  if (admins.isError) return <main className="page"><StateView title={t("admins.loadError")} message={t("common.loadErrorMessage")} action={() => void admins.refetch()} /></main>;

  const listed = (admins.data ?? []).filter((admin) => admin.role === "ADMIN");
  const activeAdmins = listed.filter((admin) => admin.status === "ACTIVE");
  const inactiveAdmins = listed.filter((admin) => admin.status !== "ACTIVE");
  const visible = view === "active" ? activeAdmins : inactiveAdmins;

  return (
    <main className="page">
      <section className="resource-head">
        <span className="eyebrow"><UserCog size={14} /> {t("admins.title")}</span>
        <Button type="button" onClick={openNew}><Plus size={17} /> {t("admins.add")}</Button>
      </section>

      <StatusTabs value={view} onChange={setView} activeCount={activeAdmins.length} inactiveCount={inactiveAdmins.length} />
      {notice && <Notice message={notice} onClose={() => setNotice("")} />}
      {!visible.length ? (
        <StateView title={view === "active" ? t("admins.noActiveTitle") : t("admins.noDeactivatedTitle")} message={view === "active" ? t("admins.noActiveMessage") : t("admins.noDeactivatedMessage")} />
      ) : (
      <div className="table-scroll">
        <table className="data-table">
          <thead><tr><th>{t("admins.columns.name")}</th><th>{t("admins.columns.email")}</th><th>{t("admins.columns.role")}</th><th>{t("admins.columns.restaurants")}</th><th>{t("admins.columns.status")}</th><th /></tr></thead>
          <tbody>
            {visible.map((admin) => (
              <tr key={admin.id} className={admin.role === "ADMIN" ? "data-table__row" : undefined} onClick={admin.role === "ADMIN" ? () => enter(admin) : undefined}>
                <td>{admin.name}</td>
                <td>{admin.email}</td>
                <td>{admin.role === "SUPERADMIN" ? <span className="badge"><ShieldCheck size={12} /> {t("common.superAdmin")}</span> : t("common.admin")}</td>
                <td>{(admin.restaurants ?? []).map((r) => r.restaurant.name).join(", ") || "—"}</td>
                <td><span className={`badge badge--${admin.status.toLowerCase()}`}>{t(`common.recordStatus.${admin.status}`)}</span></td>
                <td>
                  <button type="button" className="icon-button" aria-label={t("admins.editAria")} onClick={(event) => { event.stopPropagation(); openEdit(admin); }}><Pencil size={15} /></button>
                  <button type="button" className="icon-button icon-button--danger" aria-label={t("admins.deleteAria")} title={t("common.deletePermanently")} onClick={(event) => { event.stopPropagation(); remove.reset(); setAdminToDelete(admin); }}><Trash2 size={15} /></button>
                  {admin.role === "ADMIN" && <button type="button" className="icon-button" aria-label={t("admins.viewRestaurantsAria", { name: admin.name })} onClick={(event) => { event.stopPropagation(); enter(admin); }}><ArrowRight size={15} /></button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      {dialog && (
        <ResourceDialog title={dialog === "new" ? t("admins.add") : t("admins.edit")} eyebrow={t("admins.eyebrow")} onClose={() => setDialog(null)}>
          <form noValidate onSubmit={handleSubmit((data) => save.mutate(data))}>
            <div className="property-form-grid">
              <label><span className="label-title">{t("common.name")}<Req /></span><input {...register("name", { required: t("common.nameRequired") })} /><FieldError error={errors.name} /></label>
              <label><span className="label-title">{t("common.email")}<Req /></span><input type="email" disabled={dialog !== "new"} {...register("email", { required: t("admins.emailRequired") })} /><FieldError error={errors.email} /></label>
              <label><span className="label-title">{dialog === "new" ? <>{t("admins.password")}<Req /></> : t("admins.newPasswordOptional")}</span>
                <PasswordInput placeholder={dialog === "new" ? t("admins.setPassword") : t("admins.keepPassword")} {...register("password", { required: dialog === "new" ? t("admins.passwordRequired") : false, minLength: { value: 8, message: t("common.minPasswordLength") } })} />
                <FieldError error={errors.password} />
              </label>
              <label>{t("admins.role")}<select {...register("role")}><option value="ADMIN">{t("common.admin")}</option><option value="SUPERADMIN">{t("common.superAdmin")}</option></select></label>
              {dialog !== "new" && (
                <label className="check-option"><input type="checkbox" {...register("isActive")} /><span>{t("common.active")}</span></label>
              )}
              {restaurants.data && (
                <CheckboxList title={t("admins.assignedRestaurants")} items={restaurants.data.restaurants.map((r) => ({ id: r.id, label: r.name }))} selected={selectedRestaurantIds} onChange={setSelectedRestaurantIds} />
              )}
            </div>
            {save.error && <div className="form-error">{save.error.message}</div>}
            <DialogFooter onClose={() => setDialog(null)} loading={save.isPending} label={dialog === "new" ? t("admins.add") : t("common.saveChanges")} />
          </form>
        </ResourceDialog>
      )}
      {adminToDelete && <ConfirmDialog title={t("admins.deleteTitle")} message={t("admins.deleteMessage", { name: adminToDelete.name })} confirmLabel={t("common.deletePermanently")} danger loading={remove.isPending} error={remove.error?.message} onClose={() => setAdminToDelete(null)} onConfirm={() => remove.mutate(adminToDelete)} />}
    </main>
  );
}
