import type { Prisma } from "@prisma/client";
import type { ProductCategory } from "@/types";

/** Products visible on the public shop catalog. */
export const marketplaceListedMatch: Prisma.ProductWhereInput = {
  deletedAt: null,
  isActive: true,
  marketplaceListed: true,
};

export type MarketplaceProductSort = "featured" | "newest" | "price-low" | "price-high";

export function parseMarketplaceProductSort(value: string | null | undefined): MarketplaceProductSort {
  if (value === "newest" || value === "price-low" || value === "price-high") return value;
  return "featured";
}

export function marketplaceProductSortSpec(
  sort: MarketplaceProductSort
): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case "price-low":
      return [{ retailPrice: "asc" }, { createdAt: "desc" }];
    case "price-high":
      return [{ retailPrice: "desc" }, { createdAt: "desc" }];
    case "newest":
    case "featured":
    default:
      return [{ createdAt: "desc" }];
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

/** Build a Prisma where-clause without clobbering marketplace listing rules when search is applied. */
export function buildMarketplaceProductFilter(
  params: Pick<
    MarketplaceShopListParams,
    "category" | "search" | "minPrice" | "maxPrice" | "tags"
  >
): Prisma.ProductWhereInput {
  const clauses: Prisma.ProductWhereInput[] = [{ ...marketplaceListedMatch }];

  if (params.category) {
    clauses.push({ category: params.category });
  }

  const q = params.search?.trim();
  if (q) {
    clauses.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { sku: { contains: q, mode: "insensitive" } },
        { tags: { has: q } },
      ],
    });
  }

  const normalizedTags = normalizeShopTags(params.tags);
  if (normalizedTags.length > 0) {
    clauses.push({ tags: { hasSome: normalizedTags } });
  }

  const min = params.minPrice;
  const max = params.maxPrice;
  if (min != null || max != null) {
    const price: Prisma.FloatFilter = {};
    if (min != null && Number.isFinite(min) && min >= 0) price.gte = min;
    if (max != null && Number.isFinite(max) && max >= 0) price.lte = max;
    if (Object.keys(price).length > 0) clauses.push({ retailPrice: price });
  }

  return clauses.length === 1 ? clauses[0]! : { AND: clauses };
}
