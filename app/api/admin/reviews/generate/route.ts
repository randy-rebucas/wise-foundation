import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import { withPermission } from "@/lib/middleware/withPermission";
import { successResponse, errorResponse, forbiddenResponse, serverErrorResponse } from "@/lib/utils/apiResponse";
import { generateDemoReviews } from "@/lib/services/marketplace.service";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const handler = async (req: AuthedRequest) => {
  if (req.user.role !== "ADMIN") return forbiddenResponse("Admin only");
  try {
    const result = await generateDemoReviews();
    return successResponse(result);
  } catch (err) {
    if (err instanceof Error && err.message === "No marketplace products found") {
      return errorResponse("No marketplace products found", 400);
    }
    console.error("[admin/reviews/generate] POST error", err);
    return serverErrorResponse();
  }
};

export const POST = withStaffAuth(withPermission("manage:users")(handler));
