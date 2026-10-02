import "i18next";
import type en from "@/locales/en.json";

// Makes t("some.key") type-checked against en.json, so a typo or a key missing from
// the English file fails the build instead of showing the raw key in the UI.
declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    resources: { translation: typeof en };
  }
}
