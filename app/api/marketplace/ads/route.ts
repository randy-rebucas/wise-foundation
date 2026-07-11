import { listMarketplaceAds } from "@/lib/services/marketplace.service";
import { serverErrorResponse, successResponse } from "@/lib/utils/apiResponse";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(20, Number(searchParams.get("limit") ?? "8") || 8);
    const ads = await listMarketplaceAds(limit);
    const res = successResponse(ads);
    res.headers.set("Cache-Control", "public, s-maxage=30, stale-while-revalidate=120");
    return res;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to load ads";
    return serverErrorResponse(msg);
  }
}
