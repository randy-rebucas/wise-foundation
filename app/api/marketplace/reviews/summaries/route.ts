import { getProductReviewSummaries } from "@/lib/services/marketplace.service";
import { errorResponse, successResponse } from "@/lib/utils/apiResponse";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const productIds = searchParams
      .getAll("productId")
      .concat(
        (searchParams.get("productIds") ?? "")
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean)
      );
    const summaries = await getProductReviewSummaries(productIds);
    return successResponse(summaries);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to load review summaries";
    return errorResponse(msg, 500);
  }
}
