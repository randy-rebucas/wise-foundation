import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import { withPermission } from "@/lib/middleware/withPermission";
import { successResponse, errorResponse, forbiddenResponse, serverErrorResponse } from "@/lib/utils/apiResponse";
import { writeAuditLog } from "@/lib/services/audit.service";
import { listAdminReviews, createAdminReview, deleteAdminReviews } from "@/lib/services/marketplace.service";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const handler = async (req: AuthedRequest) => {
  if (req.user.role !== "ADMIN") return forbiddenResponse("Admin only");
  try {
    const { searchParams } = req.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
    const minRating = parseInt(searchParams.get("minRating") ?? "1", 10);
    const maxRating = parseInt(searchParams.get("maxRating") ?? "5", 10);
    const productId = searchParams.get("productId") ?? undefined;
    const search = searchParams.get("search")?.trim() || undefined;

    const { data, total, totalPages, stats } = await listAdminReviews({
      page,
      limit,
      minRating,
      maxRating,
      productId,
      search,
    });

    return successResponse(data, undefined, 200, { page, limit, total, totalPages, stats });
  } catch (err) {
    console.error("[admin/reviews] GET error", err);
    return serverErrorResponse();
  }
};

export const GET = withStaffAuth(withPermission("manage:users")(handler));

// POST /api/admin/reviews — manually create a review
const createHandler = async (req: AuthedRequest) => {
  if (req.user.role !== "ADMIN") return forbiddenResponse("Admin only");
  try {
    const body = await req.json();
    const { reviewerName, reviewerEmail, productId, rating, text, featured, images } = body as {
      reviewerName: string;
      reviewerEmail: string;
      productId: string;
      rating: number;
      text: string;
      featured?: boolean;
      images?: string[];
    };

    if (!reviewerName?.trim()) return errorResponse("Reviewer name is required", 400);
    if (!reviewerEmail?.trim()) return errorResponse("Reviewer email is required", 400);
    if (!productId?.trim()) return errorResponse("Product is required", 400);
    if (!rating || rating < 1 || rating > 5) return errorResponse("Rating must be 1–5", 400);
    if (!text?.trim()) return errorResponse("Review text is required", 400);

    const reviewId = await createAdminReview({ reviewerName, reviewerEmail, productId, rating, text, featured, images });

    void writeAuditLog({
      action: "review.created",
      actor: { id: req.user.id, name: req.user.name },
      targetId: reviewId,
      targetType: "Review",
      metadata: { productId, reviewerEmail },
    });

    return successResponse({ ok: true });
  } catch (err) {
    if (err instanceof Error && err.message === "Product not found") {
      return errorResponse("Product not found", 404);
    }
    console.error("[admin/reviews] POST error", err);
    return serverErrorResponse();
  }
};

export const POST = withStaffAuth(withPermission("manage:users")(createHandler));

// DELETE /api/admin/reviews — bulk delete reviews by {userId, reviewId} pairs
const deleteHandler = async (req: AuthedRequest) => {
  if (req.user.role !== "ADMIN") return forbiddenResponse("Admin only");
  try {
    const body = await req.json();
    const items = body?.items as { userId: string; reviewId: string }[] | undefined;
    if (!Array.isArray(items) || items.length === 0) {
      return errorResponse("No reviews specified", 400);
    }

    const deleted = await deleteAdminReviews(items);

    void writeAuditLog({
      action: "review.deleted",
      actor: { id: req.user.id, name: req.user.name },
      targetType: "Review",
      metadata: { count: deleted, items },
    });

    return successResponse({ deleted });
  } catch (err) {
    console.error("[admin/reviews] DELETE error", err);
    return serverErrorResponse();
  }
};

export const DELETE = withStaffAuth(withPermission("manage:users")(deleteHandler));
