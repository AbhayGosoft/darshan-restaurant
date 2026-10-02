import type { LucideIcon } from "lucide-react";
import { WifiOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "./Button";

export function LoadingGrid() {
  return <div className="loading-grid">{[1, 2, 3, 4].map((i) => <div className="skeleton" key={i} />)}</div>;
}

export function StateView({ icon: Icon = WifiOff, title, message, action }: {
  icon?: LucideIcon; title: string; message: string; action?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="state-view">
      <span className="state-view__icon"><Icon size={24} /></span>
      <h3>{title}</h3><p>{message}</p>
      {action && <Button variant="secondary" onClick={action}>{t("common.tryAgain")}</Button>}
    </div>
  );
}
