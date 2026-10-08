import { NavLink, Outlet } from "react-router-dom";
import { clsx } from "clsx";
import { useTranslation } from "react-i18next";
import { Building2, Settings, Tags, UtensilsCrossed } from "lucide-react";
// import { Armchair } from "lucide-react"; // Table booking disabled
import { useAppStore } from "@/store/app-store";

const baseTabs = [
  { to: "general", labelKey: "settings.tabs.general", icon: Building2 },
  { to: "menu", labelKey: "settings.tabs.menu", icon: UtensilsCrossed },
  // Table booking disabled for now — re-enable together with the "tables" route in App.tsx.
  // { to: "tables", labelKey: "settings.tabs.tables", icon: Armchair },
] as const;

const superAdminTabs = [{ to: "categories", labelKey: "settings.tabs.categories", icon: Tags }] as const;

export function SettingsLayout() {
  const { t } = useTranslation();
  const isSuperAdmin = useAppStore((state) => state.admin?.role === "SUPERADMIN");
  const tabs = isSuperAdmin ? [...baseTabs, ...superAdminTabs] : [...baseTabs];

  return (
    <main className="page settings-page">
      <section className="resource-head">
        <span className="eyebrow"><Settings size={14} /> {t("settings.eyebrow")}</span>
      </section>
      <nav className="settings-tabs">
        {tabs.map(({ to, labelKey, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => clsx("settings-tab", isActive && "active")}>
            <Icon size={16} /> {t(labelKey)}
          </NavLink>
        ))}
      </nav>
      <div className="settings-panel">
        <Outlet />
      </div>
    </main>
  );
}
