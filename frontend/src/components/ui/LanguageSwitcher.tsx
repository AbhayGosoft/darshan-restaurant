import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { clsx } from "clsx";
import { Check, ChevronDown, Languages } from "lucide-react";
import { LANGUAGES, type LanguageCode } from "@/i18n";

/** Language dropdown. A custom listbox (the native <select> popup can't be styled) that scrolls,
 * so it keeps working as more languages are added. Each option is labelled in its own script so
 * users can find theirs even when the panel is currently in a language they can't read. */
export function LanguageSwitcher({ className, compact = false }: { className?: string; compact?: boolean }) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const current = LANGUAGES.find(({ code }) => code === i18n.resolvedLanguage) ?? LANGUAGES[0];

  useEffect(() => {
    if (!open) return;
    const closeOnOutside = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutside);
    // Focus the selected option so arrow keys start from it.
    optionRefs.current[LANGUAGES.findIndex(({ code }) => code === current.code)]?.focus();
    return () => document.removeEventListener("mousedown", closeOnOutside);
  }, [open, current.code]);

  const choose = (code: LanguageCode) => {
    void i18n.changeLanguage(code);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const onListKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = optionRefs.current.findIndex((node) => node === document.activeElement);
    if (event.key === "Escape") {
      event.stopPropagation();
      setOpen(false);
      triggerRef.current?.focus();
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const next = (index + (event.key === "ArrowDown" ? 1 : -1) + LANGUAGES.length) % LANGUAGES.length;
      optionRefs.current[next]?.focus();
    }
  };

  return (
    <div ref={rootRef} className={clsx("language-select", compact && "language-select--compact", open && "language-select--open", className)}>
      <button
        ref={triggerRef}
        type="button"
        className="language-select__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("language.label")}
        onClick={() => setOpen((value) => !value)}
      >
        <Languages size={16} aria-hidden="true" />
        <span lang={current.code}>{t(`language.${current.code}`)}</span>
        <ChevronDown size={14} className="language-select__chevron" aria-hidden="true" />
      </button>
      {open && (
        <div className="language-select__panel" role="listbox" aria-label={t("language.label")} onKeyDown={onListKeyDown}>
          {LANGUAGES.map(({ code }, index) => (
            <button
              key={code}
              ref={(node) => { optionRefs.current[index] = node; }}
              type="button"
              role="option"
              lang={code}
              aria-selected={code === current.code}
              className={clsx("language-select__option", code === current.code && "active")}
              onClick={() => choose(code)}
            >
              <span>{t(`language.${code}`)}</span>
              {code === current.code && <Check size={15} aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
