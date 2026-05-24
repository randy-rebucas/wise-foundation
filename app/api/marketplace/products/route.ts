import { listMarketplaceProducts } from "@/lib/services/marketplace.service";
import {
  parseMarketplaceProductSort,
} from "@/lib/services/marketplaceShopFilters";
import { errorResponse, serverErrorResponse, successResponse } from "@/lib/utils/apiResponse";
import type { ProductCategory } from "@/types";

const categories: ProductCategory[] = ["homecare", "cosmetics", "wellness", "scent"];

function parseOptionalPrice(value: string | null): number | undefined {
  if (value == null || value.trim() === "") return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return n;
}

function parseTags(searchParams: URLSearchParams): string[] {
  const fromRepeated = searchParams.getAll("tag").map((t) => t.trim()).filter(Boolean);
  if (fromRepeated.length > 0) return fromRepeated;
  const combined = searchParams.get("tags");
  if (!combined?.trim()) return [];
  return combined.split(",").map((t) => t.trim()).filter(Boolean);
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get("page") ?? "1") || 1;
    const limit = Number(searchParams.get("limit") ?? "12") || 12;
    const search = searchParams.get("search") ?? "";
    const cat = searchParams.get("category") ?? "";
    const category = categories.includes(cat as ProductCategory) ? (cat as ProductCategory) : "";
    const sort = parseMarketplaceProductSort(searchParams.get("sort"));
    const minPrice = parseOptionalPrice(searchParams.get("minPrice"));
    const maxPrice = parseOptionalPrice(searchParams.get("maxPrice"));
    const tags = parseTags(searchParams);
    const inStockOnly = searchParams.get("inStock") === "true";

    const { data, meta } = await listMarketplaceProducts({
      page,
      limit,
      search,
      category,
      sort,
      minPrice,
      maxPrice,
      tags,
      inStockOnly,
    });
    const res = successResponse(data, undefined, 200, meta);
    // Only cache unfiltered first-page requests at the edge; skip for search/filter/pagination
    if (!search && !category && !sort && !minPrice && !maxPrice && !tags.length && !inStockOnly && page === 1) {
      res.headers.set("Cache-Control", "public, s-maxage=15, stale-while-revalidate=60");
    }
    return res;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to load products";
    if (msg.includes("No branch")) return errorResponse(msg, 503);
    return serverErrorResponse(msg);
  }
}
