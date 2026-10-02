import i18n, { currentLocale } from "@/i18n";

// Formatters are built per call (not cached at module load) so they follow the language
// the user switches to at runtime.
export const formatCurrency = (value: number) =>
  new Intl.NumberFormat(currentLocale(), { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);

export const formatNumber = (value: number) => new Intl.NumberFormat(currentLocale()).format(value);

export const shortDate = (value: string) =>
  new Intl.DateTimeFormat(currentLocale(), { day: "numeric", month: "short" }).format(new Date(value));

export const initials = (name = "User") =>
  name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();

export const timeAgo = (value: string) => {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return i18n.t("time.justNow");
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return i18n.t("time.minutesAgo", { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return i18n.t("time.hoursAgo", { count: hours });
  const days = Math.floor(hours / 24);
  if (days < 7) return i18n.t("time.daysAgo", { count: days });
  return shortDate(value);
};
