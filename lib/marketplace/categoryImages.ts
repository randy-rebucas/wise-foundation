import { MARKETPLACE_STOCK_IMAGES } from "@/lib/marketplace/stockImages";
import type {
  MarketplaceCategorySampleImages,
  MarketplaceCategoryShowcase,
} from "@/lib/services/marketplace.service";
import type { ProductCategory } from "@/types";

const STOCK_BY_CATEGORY: Record<ProductCategory, keyof typeof MARKETPLACE_STOCK_IMAGES> = {
  homecare: "cleanser",
  cosmetics: "botanical",
  wellness: "serum",
  scent: "moisturizer",
};

function showcaseFromSamples(
  samples: MarketplaceCategorySampleImages | MarketplaceCategoryShowcase
): MarketplaceCategoryShowcase {
  if ("byCategory" in samples) {
    const legacy = samples as MarketplaceCategorySampleImages;
    return {
      featured: legacy.featured ?? {},
      catalog: legacy.catalogProduct ?? null,
    };
  }
  return samples as MarketplaceCategoryShowcase;
}

/** Product image for a category, then catalog sample, then stock placeholder. */
export function pickCategoryProductImage(
  samples: MarketplaceCategorySampleImages | MarketplaceCategoryShowcase,
  category: ProductCategory | null | undefined
): string {
  const showcase = showcaseFromSamples(samples);
  if (category && showcase.featured[category]?.image) {
    return showcase.featured[category]!.image;
  }
  if (showcase.catalog?.image) return showcase.catalog.image;
  if ("catalog" in samples && typeof samples.catalog === "string" && samples.catalog) {
    return samples.catalog;
  }
  if (category) return MARKETPLACE_STOCK_IMAGES[STOCK_BY_CATEGORY[category]];
  return MARKETPLACE_STOCK_IMAGES.collection;
}

export function pickHeroFloatImages(
  samples: MarketplaceCategorySampleImages | MarketplaceCategoryShowcase,
  categories: [ProductCategory, ProductCategory, ProductCategory]
): [string, string, string] {
  return categories.map((cat) => pickCategoryProductImage(samples, cat)) as [
    string,
    string,
    string,
  ];
}

export function pickCatalogImage(
  samples: MarketplaceCategorySampleImages | MarketplaceCategoryShowcase
): string {
  const showcase = showcaseFromSamples(samples);
  if (showcase.catalog?.image) return showcase.catalog.image;
  if ("catalog" in samples && typeof samples.catalog === "string") {
    return samples.catalog ?? MARKETPLACE_STOCK_IMAGES.lifestyle;
  }
  return MARKETPLACE_STOCK_IMAGES.lifestyle;
}
