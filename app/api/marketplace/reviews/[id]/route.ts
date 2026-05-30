import { getPublicReviewById } from "@/lib/services/marketplace.service";
import { errorResponse, successResponse } from "@/lib/utils/apiResponse";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) return errorResponse("Review ID required", 400);
    const review = await getPublicReviewById(id);
    if (!review) return errorResponse("Review not found", 404);
    return successResponse(review);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to load review";
    return errorResponse(msg, 500);
  }
}
