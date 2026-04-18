import { withAuth } from "@/lib/middleware/withAuth";
import { getInventory } from "@/lib/services/inventory.service";
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const getHandler = async (req: AuthedRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get("branchId") ?? req.user.branchIds[0];
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "20");
    const lowStockOnly = searchParams.get("lowStock") === "true";

    if (!branchId) return errorResponse("Branch ID is required");

    const result = await getInventory(branchId, page, limit, lowStockOnly);
    return successResponse(result.items, undefined, 200, {
      page,
      limit,
      total: result.total,
    });
  } catch {
    return serverErrorResponse();
  }
};

export const GET = withAuth(getHandler);
