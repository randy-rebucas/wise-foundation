import { connectDB } from "@/lib/db/connect";
import { User } from "@/lib/db/models/User";
import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import { withPermission } from "@/lib/middleware/withPermission";
import { successResponse, serverErrorResponse, errorResponse } from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

// PATCH /api/admin/reviews/feature
// Body: { userId, reviewId, featured, images? }
const handler = async (req: AuthedRequest) => {
  try {
    const body = await req.json();
    const { userId, reviewId, featured, images } = body as {
      userId: string;
      reviewId: string;
      featured: boolean;
      images?: string[];
    };

    if (!userId || !reviewId || typeof featured !== "boolean") {
      return errorResponse("userId, reviewId, and featured are required", 400);
    }

    await connectDB();

    const update: Record<string, unknown> = {
      "marketplace.reviews.$[rev].featured": featured,
    };
    if (Array.isArray(images)) {
      update["marketplace.reviews.$[rev].images"] = images;
    }

    const result = await User.updateOne(
      { _id: userId },
      { $set: update },
      { arrayFilters: [{ "rev.id": reviewId }] }
    );

    if (result.matchedCount === 0) return errorResponse("Review not found", 404);

    return successResponse({ ok: true });
  } catch (err) {
    console.error("[admin/reviews/feature] PATCH error", err);
    return serverErrorResponse();
  }
};

export const PATCH = withStaffAuth(withPermission("manage:users")(handler));
