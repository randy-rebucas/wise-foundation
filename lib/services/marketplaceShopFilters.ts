import type { ProductCategory } from "@/types";

/** Products visible on the public shop catalog. */
export const marketplaceListedMatch: Record<string, unknown> = {
  deletedAt: null,
  isActive: true,
  $or: [{ marketplaceListed: true }, { marketplaceListed: { $exists: false } }],
};

export type MarketplaceProductSort = "featured" | "newest" | "price-low" | "price-high";

export function parseMarketplaceProductSort(value: string | null | undefined): MarketplaceProductSort {
  if (value === "newest" || value === "price-low" || value === "price-high") return value;
  return "featured";
}

export function marketplaceProductSortSpec(sort: MarketplaceProductSort): Record<string, 1 | -1> {
  switch (sort) {
    case "price-low":
      return { retailPrice: 1, createdAt: -1 };
    case "price-high":
      return { retailPrice: -1, createdAt: -1 };
    case "newest":
    case "featured":
    default:
      return { createdAt: -1 };
  }
}

export type MarketplaceShopListParams = {
  page?: number;
  limit?: number;
  search?: string;
  category?: ProductCategory | "";
  sort?: MarketplaceProductSort;
  minPrice?: number;
  maxPrice?: number;
  tags?: string[];
  inStockOnly?: boolean;
};

export function normalizeShopTags(tags: readonly string[] | undefined): string[] {
  if (!tags?.length) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    const t = raw.trim().toLowerCase();
    if (t && !seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
  }
  return out;
}

/** Build Mongo filter without clobbering marketplace listing rules when search is applied. */
export function buildMarketplaceProductFilter(
  params: Pick<
    MarketplaceShopListParams,
    "category" | "search" | "minPrice" | "maxPrice" | "tags"
  >
): Record<string, unknown> {
  const clauses: Record<string, unknown>[] = [{ ...marketplaceListedMatch }];

  if (params.category) {
    clauses.push({ category: params.category });
  }

  const q = params.search?.trim();
  if (q) {
    const esc = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rx = new RegExp(esc, "i");
    clauses.push({ $or: [{ name: rx }, { sku: rx }, { tags: rx }] });
  }

  const normalizedTags = normalizeShopTags(params.tags);
  if (normalizedTags.length > 0) {
    clauses.push({ tags: { $in: normalizedTags } });
  }

  const min = params.minPrice;
  const max = params.maxPrice;
  if (min != null || max != null) {
    const price: Record<string, number> = {};
    if (min != null && Number.isFinite(min) && min >= 0) price.$gte = min;
    if (max != null && Number.isFinite(max) && max >= 0) price.$lte = max;
    if (Object.keys(price).length > 0) clauses.push({ retailPrice: price });
  }

  return clauses.length === 1 ? clauses[0]! : { $and: clauses };
}
