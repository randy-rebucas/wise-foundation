import { withAuth } from "@/lib/middleware/withAuth";
import { withTenant } from "@/lib/middleware/withTenant";
import { getProductsForPOS } from "@/lib/services/product.service";
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const getHandler = async (req: AuthedRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get("branchId") ?? req.user.branchIds[0];
    const search = searchParams.get("search") ?? undefined;

    if (!branchId) return errorResponse("Branch ID is required");

    const products = await getProductsForPOS(req.user.tenantId, branchId, search);
    return successResponse(products);
  } catch {
    return serverErrorResponse();
  }
};

export const GET = withAuth(withTenant(getHandler));
