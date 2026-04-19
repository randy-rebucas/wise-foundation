import { withAuth } from "@/lib/middleware/withAuth";
import { getInventory, getInventoryByOrg } from "@/lib/services/inventory.service";
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const getHandler = async (req: AuthedRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "20");
    const lowStockOnly = searchParams.get("lowStock") === "true";

    if (req.user.role === "ORG_ADMIN" && req.user.organizationId) {
      const result = await getInventoryByOrg(req.user.organizationId, page, limit, lowStockOnly);
      return successResponse(result.items, undefined, 200, { page, limit, total: result.total });
    }

    const branchId = searchParams.get("branchId") ?? req.user.branchIds[0];
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
