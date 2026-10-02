import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Armchair, Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { queryClient } from "@/lib/query-client";
import { useAppStore } from "@/store/app-store";
import type { DiningTable, HardDeleteResult } from "@/types/domain";
import { Button } from "@/components/ui/Button";
import { LoadingGrid, StateView } from "@/components/ui/StateView";
import { ConfirmDialog, DialogFooter, FieldError, Notice, ResourceDialog, Req, StatusTabs, hardDeleteMessage, type ListStatus } from "@/components/resource/dialog-kit";

type TableForm = Omit<DiningTable, "id">;

export function TablesSettingsPage() {
  const { t } = useTranslation();
  const restaurantId = useAppStore((state) => state.activeRestaurant!.id);
  const base = `/admin/restaurants/${restaurantId}/tables`;
  const query = useQuery({ queryKey: ["admin-tables", restaurantId], queryFn: () => api<DiningTable[]>(base) });
  const [dialog, setDialog] = useState<DiningTable | "new" | null>(null);
  const [tableToDelete, setTableToDelete] = useState<DiningTable | null>(null);
  const [view, setView] = useState<ListStatus>("active");
  const [notice, setNotice] = useState("");
  const { register, handleSubmit, reset, formState: { errors } } = useForm<TableForm>({ defaultValues: { name: "", capacity: 2, preference: "ANY", section: "", status: "ACTIVE" } });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-tables", restaurantId] });
  const save = useMutation({ mutationFn: (body: TableForm) => dialog !== "new" && dialog ? api(`${base}/${dialog.id}`, { method: "PATCH", body }) : api(base, { method: "POST", body }), onSuccess: async () => { await invalidate(); setDialog(null); } });
  const remove = useMutation({ mutationFn: (table: DiningTable) => api<HardDeleteResult>(`${base}/${table.id}/permanent`, { method: "DELETE" }), onSuccess: (result, table) => { setNotice(hardDeleteMessage(table.name, result)); setTableToDelete(null); void invalidate(); } });
  const open = (table: DiningTable | "new") => { reset(table === "new" ? { name: "", capacity: 2, preference: "ANY", section: "", status: "ACTIVE" } : table); setDialog(table); };

  if (query.isLoading) return <main className="page"><LoadingGrid /></main>;
  if (query.isError) return <main className="page"><StateView title={t("tables.loadError")} message={t("common.loadErrorMessage")} action={() => void query.refetch()} /></main>;

  // Maintenance tables are still part of the working set; only INACTIVE ones move to the deactivated list.
  const activeTables = (query.data ?? []).filter((table) => table.status !== "INACTIVE");
  const inactiveTables = (query.data ?? []).filter((table) => table.status === "INACTIVE");
  const visible = view === "active" ? activeTables : inactiveTables;

  return <main className="page">
    <section className="resource-head"><span className="eyebrow"><Armchair size={14} /> {t("tables.title")}</span><Button onClick={() => open("new")}><Plus size={17} /> {t("tables.add")}</Button></section>
    <StatusTabs value={view} onChange={setView} activeCount={activeTables.length} inactiveCount={inactiveTables.length} />
    {notice && <Notice message={notice} onClose={() => setNotice("")} />}
    {!visible.length ? (view === "active" ? <StateView title={t("tables.emptyTitle")} message={t("tables.emptyMessage")} /> : <StateView title={t("tables.noDeactivatedTitle")} message={t("tables.noDeactivatedMessage")} />) : <div className="table-scroll"><table className="data-table"><thead><tr><th>{t("tables.columns.table")}</th><th>{t("tables.columns.capacity")}</th><th>{t("tables.columns.preference")}</th><th>{t("tables.columns.section")}</th><th>{t("tables.columns.status")}</th><th /></tr></thead><tbody>{visible.map((table) => <tr key={table.id}><td>{table.name}</td><td>{table.capacity}</td><td>{t(`tables.preferences.${table.preference}`)}</td><td>{table.section || "—"}</td><td><span className="badge">{t(`tables.statuses.${table.status}`)}</span></td><td><button className="icon-button" onClick={() => open(table)}><Pencil size={14} /></button><button className="icon-button icon-button--danger" aria-label={t("tables.deleteAria")} title={t("common.deletePermanently")} onClick={() => { remove.reset(); setTableToDelete(table); }}><Trash2 size={14} /></button></td></tr>)}</tbody></table></div>}
    {dialog && <ResourceDialog title={dialog === "new" ? t("tables.add") : t("tables.edit")} eyebrow={t("tables.eyebrow")} onClose={() => setDialog(null)}><form noValidate onSubmit={handleSubmit((data) => save.mutate({ ...data, capacity: Number(data.capacity), section: data.section || null }))}><div className="property-form-grid"><label><span className="label-title">{t("common.name")}<Req /></span><input {...register("name", { required: t("common.nameRequired") })} /><FieldError error={errors.name} /></label><label><span className="label-title">{t("tables.columns.capacity")}<Req /></span><input type="number" min="1" {...register("capacity", { valueAsNumber: true, min: 1 })} /></label><label>{t("tables.columns.preference")}<select {...register("preference")}><option value="ANY">{t("tables.preferences.ANY")}</option><option value="WINDOW">{t("tables.preferences.WINDOW")}</option><option value="INDOOR">{t("tables.preferences.INDOOR")}</option><option value="OUTDOOR">{t("tables.preferences.OUTDOOR")}</option></select></label><label>{t("tables.columns.section")}<input {...register("section")} /></label><label>{t("tables.columns.status")}<select {...register("status")}><option value="ACTIVE">{t("tables.statuses.ACTIVE")}</option><option value="MAINTENANCE">{t("tables.statuses.MAINTENANCE")}</option><option value="INACTIVE">{t("tables.statuses.INACTIVE")}</option></select></label></div>{save.error && <div className="form-error">{save.error.message}</div>}<DialogFooter onClose={() => setDialog(null)} loading={save.isPending} label={dialog === "new" ? t("tables.add") : t("common.saveChanges")} /></form></ResourceDialog>}
    {tableToDelete && <ConfirmDialog title={t("tables.deleteTitle")} message={t("tables.deleteMessage", { name: tableToDelete.name })} confirmLabel={t("common.deletePermanently")} danger loading={remove.isPending} error={remove.error?.message} onClose={() => setTableToDelete(null)} onConfirm={() => remove.mutate(tableToDelete)} />}
  </main>;
}
