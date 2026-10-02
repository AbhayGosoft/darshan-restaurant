import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "@/locales/en.json";
import hi from "@/locales/hi.json";
import gu from "@/locales/gu.json";

// To add a language: create src/locales/<code>.json with the same keys as en.json,
// import it here, and add it to LANGUAGES. Missing keys fall back to English.
export const LANGUAGES = [
  { code: "en", locale: "en-IN" },
  { code: "hi", locale: "hi-IN" },
  { code: "gu", locale: "gu-IN" },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]["code"];

export const resources = {
  en: { translation: en },
  hi: { translation: hi },
  gu: { translation: gu },
} as const;

// Kept outside the session store on purpose: signing out must not reset the chosen language.
const STORAGE_KEY = "restaurant-admin-language";

const isSupported = (code: string | null | undefined): code is LanguageCode =>
  LANGUAGES.some((language) => language.code === code);

const detectLanguage = (): LanguageCode => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isSupported(stored)) return stored;
  } catch {
    // Storage can be unavailable (private mode / blocked); fall through to the device language.
  }
  const device = navigator.language?.slice(0, 2).toLowerCase();
  return isSupported(device) ? device : "en";
};

void i18n.use(initReactI18next).init({
  resources,
  lng: detectLanguage(),
  fallbackLng: "en",
  interpolation: { escapeValue: false }, // React already escapes rendered values
});

const syncDocument = (code: string) => {
  document.documentElement.lang = code;
};
syncDocument(i18n.language);

i18n.on("languageChanged", (code) => {
  syncDocument(code);
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    // Non-fatal: the choice just won't survive a reload.
  }
});

export const currentLanguage = (): LanguageCode => (isSupported(i18n.resolvedLanguage) ? i18n.resolvedLanguage : "en");

/** BCP-47 tag for Intl formatters (dates, numbers, currency) in the current language. */
export const currentLocale = () => LANGUAGES.find((language) => language.code === currentLanguage())!.locale;

export default i18n;
