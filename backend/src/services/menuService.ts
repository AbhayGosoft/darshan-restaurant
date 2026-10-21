import { prisma } from "../lib/prisma.js";
import { resolveAssetUrl } from "../utils/images.js";
import { DEFAULT_LANGUAGE, type Language } from "../i18n/languages.js";
import { translator } from "../i18n/translations.js";

export const getMenu = async (restaurantId: string, lang: Language = DEFAULT_LANGUAGE) => {
  const categories = await prisma.menuCategory.findMany({
    where: { restaurantId, isActive: true },
    orderBy: { sortOrder: "asc" },
    include: {
      items: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
    },
  });

  return categories.map((category) => ({
    category: translator(category.translations, lang)("name", category.name),
    items: category.items.map((item) => {
      const t = translator(item.translations, lang);
      return {
        id: item.id,
        name: t("name", item.name),
        description: t("description", item.description),
        price: Number(item.price),
        image: resolveAssetUrl(item.image ?? undefined) ?? null,
        isVeg: item.isVeg,
      };
    }),
  }));
};
