// Languages restaurant content (names, descriptions, menu) can be translated into for the
// Darshan customer app. English is entered in the regular form fields; these are the extras.
// Separate from LANGUAGES in ./index.ts, which is the admin panel's own UI language.
export const CONTENT_LANGUAGES = [
  { code: "hi", nativeName: "हिन्दी", englishName: "Hindi" },
  { code: "ta", nativeName: "தமிழ்", englishName: "Tamil" },
  { code: "ml", nativeName: "മലയാളം", englishName: "Malayalam" },
  { code: "or", nativeName: "ଓଡ଼ିଆ", englishName: "Odia" },
  { code: "gu", nativeName: "ગુજરાતી", englishName: "Gujarati" },
  { code: "kn", nativeName: "ಕನ್ನಡ", englishName: "Kannada" },
  { code: "bn", nativeName: "বাংলা", englishName: "Bengali" },
  { code: "pa", nativeName: "ਪੰਜਾਬੀ", englishName: "Punjabi" },
  { code: "as", nativeName: "অসমীয়া", englishName: "Assamese" },
  { code: "mr", nativeName: "मराठी", englishName: "Marathi" },
] as const;

export type ContentLanguage = (typeof CONTENT_LANGUAGES)[number]["code"];

/** { "hi": { "name": "...", "about": "..." } } — blank fields fall back to English in the app. */
export type Translations = Partial<Record<ContentLanguage, Record<string, string>>>;
