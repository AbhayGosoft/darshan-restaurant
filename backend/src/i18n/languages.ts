/**
 * Languages the customer (Darshan) app can ask for. English is the source language: it is stored
 * in the regular columns, every other language lives in a `translations` JSON column.
 */
export const SUPPORTED_LANGUAGES = ["en", "hi", "ta", "ml", "or", "gu", "kn", "bn", "pa", "as", "mr"] as const;

export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: Language = "en";

/** Languages that can carry translations (everything except the English source). */
export const TRANSLATION_LANGUAGES = SUPPORTED_LANGUAGES.filter((lang) => lang !== DEFAULT_LANGUAGE) as Exclude<Language, "en">[];

export const isLanguage = (value: unknown): value is Language =>
  typeof value === "string" && (SUPPORTED_LANGUAGES as readonly string[]).includes(value);

/** "hi", "HI", "hi-IN", "hi_IN" → "hi"; anything unsupported → undefined. */
export const normalizeLanguage = (value: unknown): Language | undefined => {
  if (typeof value !== "string") return undefined;
  const primary = value.trim().toLowerCase().split(/[-_]/)[0];
  return isLanguage(primary) ? primary : undefined;
};

/** Picks the highest-weighted supported language from an Accept-Language header ("hi-IN,hi;q=0.9,en;q=0.8"). */
export const parseAcceptLanguage = (header: unknown): Language | undefined => {
  if (typeof header !== "string" || !header.trim()) return undefined;
  const ranked = header
    .split(",")
    .map((part, index) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      const weight = q ? Number(q.slice(2)) : 1;
      return { lang: normalizeLanguage(tag), weight: Number.isFinite(weight) ? weight : 0, index };
    })
    .filter((entry) => entry.lang && entry.weight > 0)
    .sort((a, b) => b.weight - a.weight || a.index - b.index);
  return ranked[0]?.lang;
};

/** `?lang=` wins over the Accept-Language header; neither (or an unsupported one) means English. */
export const resolveRequestLanguage = (query: unknown, acceptLanguage: unknown): { lang: Language; explicit: boolean } => {
  const requested = normalizeLanguage(query) ?? parseAcceptLanguage(acceptLanguage);
  return { lang: requested ?? DEFAULT_LANGUAGE, explicit: requested !== undefined };
};
