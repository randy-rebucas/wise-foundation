import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import { withAnyPermission } from "@/lib/middleware/withAnyPermission";
import { getPurchaseOrderCatalogTemplate } from "@/lib/services/purchaseOrderTemplate.service";
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const getHandler = async (_req: AuthedRequest) => {
  try {
    const template = await getPurchaseOrderCatalogTemplate();
    return successResponse(template);
  } catch (error) {
    console.error("[GET /api/purchase-orders/template]", error);
    if (error instanceof Error) return errorResponse(error.message, 500);
    return serverErrorResponse();
  }
};

const poAccess = withAnyPermission("manage:inventory", "submit:org_orders");

export const GET = withStaffAuth(poAccess(getHandler));
