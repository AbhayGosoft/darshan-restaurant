import { describe, expect, it } from "vitest";
import { normalizeLanguage, parseAcceptLanguage, resolveRequestLanguage, SUPPORTED_LANGUAGES } from "../../src/i18n/languages.js";
import { pickTranslations, translationsInputSchema, translator } from "../../src/i18n/translations.js";
import { cancellationReasonLabel, notificationText, statusLabel } from "../../src/i18n/messages.js";

describe("language resolution", () => {
  it("normalizes region and case variants", () => {
    expect(normalizeLanguage("hi")).toBe("hi");
    expect(normalizeLanguage("HI-in")).toBe("hi");
    expect(normalizeLanguage("ta_IN")).toBe("ta");
    expect(normalizeLanguage("fr")).toBeUndefined();
    expect(normalizeLanguage(["hi"])).toBeUndefined();
  });

  it("picks the highest-weighted supported Accept-Language entry", () => {
    expect(parseAcceptLanguage("fr-FR,fr;q=0.9,gu;q=0.8,en;q=0.7")).toBe("gu");
    expect(parseAcceptLanguage("en;q=0.5,mr")).toBe("mr");
    expect(parseAcceptLanguage("fr,de")).toBeUndefined();
    expect(parseAcceptLanguage(undefined)).toBeUndefined();
  });

  it("prefers ?lang= over the header and defaults to English", () => {
    expect(resolveRequestLanguage("bn", "hi")).toEqual({ lang: "bn", explicit: true });
    expect(resolveRequestLanguage("xx", "kn-IN")).toEqual({ lang: "kn", explicit: true });
    expect(resolveRequestLanguage(undefined, undefined)).toEqual({ lang: "en", explicit: false });
    expect(resolveRequestLanguage("xx", "fr")).toEqual({ lang: "en", explicit: false });
  });
});

describe("translator", () => {
  const translations = { hi: { name: "शिव भोजनालय", about: "  " } };

  it("returns the translation when present", () => {
    expect(translator(translations, "hi")("name", "Shiv Bhojnalay")).toBe("शिव भोजनालय");
  });

  it("falls back to English per field when missing or blank", () => {
    const t = translator(translations, "hi");
    expect(t("about", "Family restaurant")).toBe("Family restaurant");
    expect(t("cuisineLabel", null)).toBeNull();
    expect(translator(translations, "gu")("name", "Shiv Bhojnalay")).toBe("Shiv Bhojnalay");
  });

  it("ignores translations for English and tolerates bad stored data", () => {
    expect(translator({ en: { name: "Other" } }, "en")("name", "Shiv")).toBe("Shiv");
    expect(translator(null, "hi")("name", "Shiv")).toBe("Shiv");
    expect(translator("garbage", "hi")("name", "Shiv")).toBe("Shiv");
  });

  it("pickTranslations keeps only the requested non-empty fields", () => {
    expect(pickTranslations({ hi: { name: "नाम", about: "x" }, gu: { about: "y" }, ta: { name: " " } }, ["name"])).toEqual({ hi: { name: "नाम" } });
  });
});

describe("translationsInputSchema", () => {
  const schema = translationsInputSchema(["name", "description"] as const);

  it("trims values and drops blank fields and empty languages", () => {
    expect(schema.parse({ hi: { name: "  पनीर  ", description: "" }, gu: { name: "   " }, ta: null })).toEqual({ hi: { name: "पनीर" } });
  });

  it("rejects unknown languages, English, and unknown fields", () => {
    expect(() => schema.parse({ fr: { name: "x" } })).toThrow();
    expect(() => schema.parse({ en: { name: "x" } })).toThrow();
    expect(() => schema.parse({ hi: { price: "10" } })).toThrow();
  });
});

describe("fixed copy", () => {
  it("has status, reason and notification text for every supported language", () => {
    for (const lang of SUPPORTED_LANGUAGES) {
      expect(statusLabel("PREPARING", lang)).toBeTruthy();
      expect(cancellationReasonLabel("OTHER", lang)).toBeTruthy();
      const { title, body } = notificationText("rejected", lang, { orderId: "#ABC1", restaurant: "R", time: "1:00 PM", people: 2, amount: 250, reason: "Closed" });
      expect(title).toBeTruthy();
      expect(body).toContain("#ABC1");
      expect(body).toContain("250");
      expect(body).toContain("Closed");
    }
  });

  it("keeps the English wording unchanged", () => {
    expect(notificationText("modified", "en", { orderId: "#A", restaurant: "R", time: "1:00 PM", people: 1, amount: 0 }).body).toBe(
      "Your order #A is now for 1 person, arriving at 1:00 PM today.",
    );
    expect(statusLabel("READY", "hi")).toBe("तैयार है");
  });
});
