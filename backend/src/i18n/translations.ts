import { z } from "zod";
import { DEFAULT_LANGUAGE, TRANSLATION_LANGUAGES, type Language } from "./languages.js";

/** Stored shape of a `translations` column: { "hi": { "name": "...", "about": "..." }, "gu": { ... } }. */
export type Translations<F extends string = string> = Partial<Record<Exclude<Language, "en">, Partial<Record<F, string>>>>;

/** Translatable text fields per model. English stays in the model's own columns. */
export const RESTAURANT_TRANSLATABLE_FIELDS = ["name", "cuisineLabel", "about", "offerText", "offerSubText", "addressLine", "city", "state"] as const;
export const RESTAURANT_CATEGORY_TRANSLATABLE_FIELDS = ["label"] as const;
export const MENU_CATEGORY_TRANSLATABLE_FIELDS = ["name"] as const;
export const MENU_ITEM_TRANSLATABLE_FIELDS = ["name", "description"] as const;
/** Restaurant fields copied onto a booking when it is placed. */
export const BOOKING_SNAPSHOT_FIELDS = ["name", "cuisineLabel"] as const;

const asTranslations = (value: unknown): Translations => (value && typeof value === "object" && !Array.isArray(value) ? (value as Translations) : {});

/**
 * Returns a lookup for one record: `t("name", record.name)` gives the requested language's text,
 * falling back to the English value field by field when that translation is missing or blank.
 */
export const translator = (translations: unknown, lang: Language) => {
  const forLang = lang === DEFAULT_LANGUAGE ? undefined : asTranslations(translations)[lang as Exclude<Language, "en">];
  return <T extends string | null | undefined>(field: string, fallback: T): string | T => {
    const value = forLang?.[field];
    return typeof value === "string" && value.trim() ? value : fallback;
  };
};

/** Keeps only `fields` (and only non-empty languages) — used to snapshot translations onto bookings. */
export const pickTranslations = <F extends string>(translations: unknown, fields: readonly F[]): Translations<F> => {
  const result: Translations<F> = {};
  for (const [lang, values] of Object.entries(asTranslations(translations))) {
    if (!values || typeof values !== "object") continue;
    const picked = Object.fromEntries(fields.flatMap((field) => (typeof values[field] === "string" && values[field]!.trim() ? [[field, values[field]]] : [])));
    if (Object.keys(picked).length) result[lang as Exclude<Language, "en">] = picked as Partial<Record<F, string>>;
  }
  return result;
};

/** Admin responses always carry the full object so every language can be edited. */
export const translationsForAdmin = (translations: unknown) => asTranslations(translations);

/**
 * Validates `translations` sent by the admin panel. Unknown languages or fields are rejected,
 * values are trimmed, and blank values / empty languages are dropped so an untranslated field
 * falls back to English. On update the object replaces the stored one as a whole.
 */
export const translationsInputSchema = <F extends string>(fields: readonly [F, ...F[]]) =>
  z
    .partialRecord(
      z.enum(TRANSLATION_LANGUAGES as [Exclude<Language, "en">, ...Exclude<Language, "en">[]]),
      z.partialRecord(z.enum(fields), z.string().trim().max(5000).nullish()).nullish(),
    )
    .transform((input) => {
      const cleaned: Translations<F> = {};
      for (const [lang, values] of Object.entries(input)) {
        const kept = Object.fromEntries(Object.entries(values ?? {}).filter(([, value]) => typeof value === "string" && value.length > 0));
        if (Object.keys(kept).length) cleaned[lang as Exclude<Language, "en">] = kept as Partial<Record<F, string>>;
      }
      return cleaned;
    });
