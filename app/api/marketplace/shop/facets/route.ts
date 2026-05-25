import { getMarketplaceShopFacets } from "@/lib/services/marketplace.service";
import { errorResponse, serverErrorResponse, successResponse } from "@/lib/utils/apiResponse";

export async function GET() {
  try {
    const facets = await getMarketplaceShopFacets();
    const res = successResponse(facets);
    res.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    return res;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to load shop filters";
    if (msg.includes("No branch")) return errorResponse(msg, 503);
    return serverErrorResponse(msg);
  }
}
