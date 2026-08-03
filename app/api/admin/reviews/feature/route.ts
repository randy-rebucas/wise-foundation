import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import { withPermission } from "@/lib/middleware/withPermission";
import { successResponse, serverErrorResponse, errorResponse, forbiddenResponse } from "@/lib/utils/apiResponse";
import { writeAuditLog } from "@/lib/services/audit.service";
import { setAdminReviewFeatured } from "@/lib/services/marketplace.service";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

// PATCH /api/admin/reviews/feature
// Body: { userId, reviewId, featured, images? }
const handler = async (req: AuthedRequest) => {
  if (req.user.role !== "ADMIN") return forbiddenResponse("Admin only");
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

    const found = await setAdminReviewFeatured(reviewId, featured, images);
    if (!found) return errorResponse("Review not found", 404);

    void writeAuditLog({
      action: "review.featured_changed",
      actor: { id: req.user.id, name: req.user.name },
      targetId: reviewId,
      targetType: "Review",
      metadata: { userId, featured },
    });

    return successResponse({ ok: true });
  } catch (err) {
    console.error("[admin/reviews/feature] PATCH error", err);
    return serverErrorResponse();
  }
};

export const PATCH = withStaffAuth(withPermission("manage:users")(handler));
