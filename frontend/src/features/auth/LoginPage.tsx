import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowRight, KeyRound, Mail, ShieldCheck, Sparkles, UtensilsCrossed } from "lucide-react";
import { api } from "@/lib/api-client";
import { useAppStore } from "@/store/app-store";
import type { AdminUser } from "@/types/domain";
import { Button } from "@/components/ui/Button";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { Req } from "@/components/resource/dialog-kit";

interface LoginValues { email: string; password: string }

export function LoginPage() {
  const { t } = useTranslation();
  const setSession = useAppStore((state) => state.setSession);
  const { register, handleSubmit, formState: { errors } } = useForm<LoginValues>({
    defaultValues: { email: "", password: "" },
  });
  const login = useMutation({
    mutationFn: (values: LoginValues) => api<{ token: string; admin: AdminUser }>("/admin/auth/login", { method: "POST", body: values }),
    onSuccess: ({ token, admin }) => setSession(token, admin),
  });

  return (
    <main className="login-page">
      <section className="login-visual">
        <div className="brand brand--light"><span className="brand__mark"><UtensilsCrossed /></span><span>{t("common.appName")}</span></div>
        <div className="login-visual__content">
          <span className="eyebrow eyebrow--light"><Sparkles size={14} /> {t("login.tagline")}</span>
          <h1>{t("login.headlineLine1")}<br />{t("login.headlineLine2")}</h1>
          <p>{t("login.intro")}</p>
          <div className="trust-row"><ShieldCheck /><span><strong>{t("login.secureTitle")}</strong><small>{t("login.secureSubtitle")}</small></span></div>
        </div>
        <div className="login-orbit login-orbit--one" /><div className="login-orbit login-orbit--two" />
      </section>
      <section className="login-panel">
        <div className="login-form-wrap">
          <div className="brand brand--mobile"><span className="brand__mark"><UtensilsCrossed /></span><span>{t("common.appName")}</span></div>
          <LanguageSwitcher className="login-language" />
          <span className="eyebrow">{t("login.welcome")}</span>
          <h2>{t("login.title")}</h2>
          <p className="muted">{t("login.subtitle")}</p>
          <form onSubmit={handleSubmit((values) => login.mutate(values))}>
            <label><span className="label-title">{t("login.emailLabel")}<Req /></span><div className="input-wrap"><Mail size={18} /><input type="email" placeholder="you@restaurant.com" {...register("email", { required: t("login.emailRequired") })} /></div></label>
            {errors.email && <small className="error-text">{errors.email.message}</small>}
            <label><span className="label-title">{t("login.passwordLabel")}<Req /></span><div className="input-wrap"><KeyRound size={18} /><PasswordInput placeholder={t("login.passwordPlaceholder")} {...register("password", { required: t("login.passwordRequired") })} /></div></label>
            {errors.password && <small className="error-text">{errors.password.message}</small>}
            {login.error && <div className="form-error">{login.error.message}</div>}
            <Button type="submit" loading={login.isPending}>{t("login.submit")} <ArrowRight size={18} /></Button>
          </form>
          <p className="login-help">{t("login.help")}</p>
        </div>
      </section>
    </main>
  );
}
