import { listMarketplaceProducts } from "@/lib/services/marketplace.service";
import { errorResponse, serverErrorResponse, successResponse } from "@/lib/utils/apiResponse";
import type { ProductCategory } from "@/types";

const categories: ProductCategory[] = ["homecare", "cosmetics", "wellness", "scent"];

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get("page") ?? "1") || 1;
    const limit = Number(searchParams.get("limit") ?? "12") || 12;
    const search = searchParams.get("search") ?? "";
    const cat = searchParams.get("category") ?? "";
    const category = categories.includes(cat as ProductCategory) ? (cat as ProductCategory) : "";

    const { data, meta } = await listMarketplaceProducts({ page, limit, search, category });
    return successResponse(data, undefined, 200, meta);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to load products";
    if (msg.includes("No branch")) return errorResponse(msg, 503);
    return serverErrorResponse(msg);
  }
}
