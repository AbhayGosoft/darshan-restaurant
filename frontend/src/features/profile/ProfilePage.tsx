import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { KeyRound, LogOut, ShieldCheck, UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api-client";
import { useAppStore } from "@/store/app-store";
import { initials } from "@/lib/format";
import type { AdminUser } from "@/types/domain";
import { Button } from "@/components/ui/Button";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { LoadingGrid, StateView } from "@/components/ui/StateView";
import { FieldError, Req } from "@/components/resource/dialog-kit";

type PasswordForm = { currentPassword: string; newPassword: string; confirmPassword: string };

export function ProfilePage() {
  const { t } = useTranslation();
  const clearSession = useAppStore((state) => state.clearSession);
  const me = useQuery({ queryKey: ["admin-auth", "me"], queryFn: () => api<AdminUser>("/admin/auth/me") });
  const [passwordSaved, setPasswordSaved] = useState(false);
  const passwordForm = useForm<PasswordForm>({ defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" } });

  const changePassword = useMutation({
    mutationFn: (data: PasswordForm) => api("/admin/auth/change-password", {
      method: "PATCH",
      body: { currentPassword: data.currentPassword, newPassword: data.newPassword },
    }),
    onSuccess: () => {
      passwordForm.reset();
      setPasswordSaved(true);
      setTimeout(() => setPasswordSaved(false), 2500);
    },
  });

  if (me.isLoading) return <main className="page"><LoadingGrid /></main>;
  if (me.isError || !me.data) return <main className="page"><StateView title={t("profile.loadError")} message={t("common.loadErrorMessage")} action={() => void me.refetch()} /></main>;

  return (
    <main className="page profile-page">
      <section className="resource-head">
        <span className="eyebrow"><UserRound size={14} /> {t("profile.title")}</span>
      </section>

      <div className="settings-form profile-card">
        <div className="profile-photo-row">
          <div className="profile-photo"><span>{initials(me.data.name)}</span></div>
          <div>
            <strong>{me.data.name}</strong>
            <div className="muted">{me.data.email}</div>
            {me.data.role === "SUPERADMIN" && <span className="badge"><ShieldCheck size={12} /> {t("common.superAdmin")}</span>}
          </div>
        </div>
      </div>

      <form className="settings-form profile-card" noValidate onSubmit={passwordForm.handleSubmit((data) => changePassword.mutate(data))}>
        <div className="profile-card__head"><KeyRound size={18} /><div><strong>{t("profile.changePassword")}</strong><small>{t("profile.changePasswordHint")}</small></div></div>
        <div className="property-form-grid">
          <label className="property-form-grid__wide"><span className="label-title">{t("profile.currentPassword")}<Req /></span>
            <PasswordInput placeholder={t("profile.currentPasswordPlaceholder")} {...passwordForm.register("currentPassword", { required: t("profile.currentPasswordRequired") })} />
            <FieldError error={passwordForm.formState.errors.currentPassword} />
          </label>
          <label><span className="label-title">{t("profile.newPassword")}<Req /></span>
            <PasswordInput placeholder={t("profile.newPasswordPlaceholder")} {...passwordForm.register("newPassword", { required: t("profile.newPasswordRequired"), minLength: { value: 8, message: t("common.minPasswordLength") } })} />
            <FieldError error={passwordForm.formState.errors.newPassword} />
          </label>
          <label><span className="label-title">{t("profile.confirmPassword")}<Req /></span>
            <PasswordInput placeholder={t("profile.confirmPassword")} {...passwordForm.register("confirmPassword", {
              required: t("profile.confirmPasswordRequired"),
              validate: (value) => value === passwordForm.watch("newPassword") || t("profile.passwordsMismatch"),
            })} />
            <FieldError error={passwordForm.formState.errors.confirmPassword} />
          </label>
        </div>
        {changePassword.error && <div className="form-error">{changePassword.error.message}</div>}
        <footer className="settings-form__footer">
          {passwordSaved && <span className="settings-saved">{t("profile.passwordUpdated")}</span>}
          <Button type="submit" variant="secondary" loading={changePassword.isPending}><KeyRound size={17} /> {t("profile.updatePassword")}</Button>
        </footer>
      </form>

      <div className="profile-card profile-card--danger">
        <div><strong>{t("nav.signOut")}</strong><small>{t("profile.signOutHint")}</small></div>
        <Button type="button" variant="ghost" onClick={clearSession}><LogOut size={17} /> {t("nav.signOut")}</Button>
      </div>
    </main>
  );
}
