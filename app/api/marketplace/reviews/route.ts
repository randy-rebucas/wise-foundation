import { listPublicMarketplaceReviews } from "@/lib/services/marketplace.service";
import { errorResponse, successResponse } from "@/lib/utils/apiResponse";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") ?? "50", 10);
    const productId = searchParams.get("productId")?.trim() || undefined;
    const { reviews, stats } = await listPublicMarketplaceReviews({ limit, productId });
    return successResponse(reviews, undefined, 200, {
      averageRating: stats.averageRating,
      reviewCount: stats.reviewCount,
      fiveStarCount: stats.fiveStarCount,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to load reviews";
    return errorResponse(msg, 500);
  }
}
