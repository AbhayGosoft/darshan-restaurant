import { useState } from "react";
import { clsx } from "clsx";
import { Check, Languages } from "lucide-react";
import { useTranslation } from "react-i18next";
import { CONTENT_LANGUAGES, type ContentLanguage, type Translations } from "@/i18n/content-languages";

export type TranslationField = {
  key: string;
  label: string;
  multiline?: boolean;
  /** Current English value, shown as the placeholder so the admin can see what they're translating. */
  source?: string | null;
};

/**
 * Optional per-language copies of a record's text fields. One language is edited at a time;
 * each tab shows how many of the fields are filled in. Blank fields fall back to English.
 */
export function TranslationsEditor({ fields, value, onChange }: { fields: TranslationField[]; value: Translations; onChange: (next: Translations) => void }) {
  const { t } = useTranslation();
  const [active, setActive] = useState<ContentLanguage>(CONTENT_LANGUAGES[0].code);
  const current = value[active] ?? {};
  const filledCount = (code: ContentLanguage) => fields.filter((field) => value[code]?.[field.key]?.trim()).length;
  const setField = (key: string, text: string) => onChange({ ...value, [active]: { ...current, [key]: text } });

  return (
    <div className="property-form-grid__wide translations-editor">
      <div className="translations-editor__head">
        <strong><Languages size={15} /> {t("translations.title")}</strong>
        <small>{t("translations.hint")}</small>
      </div>
      <div className="translations-editor__tabs" role="tablist" aria-label={t("translations.title")}>
        {CONTENT_LANGUAGES.map((language) => {
          const count = filledCount(language.code);
          const complete = count === fields.length;
          return (
            <button
              key={language.code}
              type="button"
              role="tab"
              lang={language.code}
              title={language.englishName}
              aria-selected={active === language.code}
              className={clsx("translations-editor__tab", active === language.code && "active", complete ? "is-complete" : count > 0 && "is-partial")}
              onClick={() => setActive(language.code)}
            >
              {language.nativeName}
              {count > 0 && <span className="translations-editor__count">{complete ? <Check size={11} aria-label={t("translations.complete")} /> : `${count}/${fields.length}`}</span>}
            </button>
          );
        })}
      </div>
      <div className="property-form-grid translations-editor__fields" lang={active}>
        {fields.map((field) => (
          <label key={field.key} className={clsx(field.multiline && "property-form-grid__wide")}>
            {field.label}
            {field.multiline
              ? <textarea rows={3} value={current[field.key] ?? ""} placeholder={field.source ?? ""} onChange={(event) => setField(field.key, event.target.value)} />
              : <input value={current[field.key] ?? ""} placeholder={field.source ?? ""} onChange={(event) => setField(field.key, event.target.value)} />}
          </label>
        ))}
      </div>
    </div>
  );
}
