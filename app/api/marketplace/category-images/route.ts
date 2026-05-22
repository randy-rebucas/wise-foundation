import { getMarketplaceCategoryShowcase } from "@/lib/services/marketplace.service";
import { errorResponse, successResponse } from "@/lib/utils/apiResponse";

export async function GET() {
  try {
    const showcase = await getMarketplaceCategoryShowcase();
    return successResponse(showcase);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to load category images";
    return errorResponse(msg, 500);
  }
}
