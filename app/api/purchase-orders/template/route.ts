import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import { withAnyPermission } from "@/lib/middleware/withAnyPermission";
import {
  getPurchaseOrderCatalogTemplateAll,
  getPurchaseOrderCatalogTemplatePage,
} from "@/lib/services/purchaseOrderTemplate.service";
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const getHandler = async (req: AuthedRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const all = searchParams.get("all") === "true" || !searchParams.has("page");

    if (all) {
      const template = await getPurchaseOrderCatalogTemplateAll();
      return successResponse(template);
    }

    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const limit = parseInt(searchParams.get("limit") ?? "100", 10);
    const template = await getPurchaseOrderCatalogTemplatePage(page, limit);
    return successResponse(template);
  } catch (error) {
    console.error("[GET /api/purchase-orders/template]", error);
    if (error instanceof Error) return errorResponse(error.message, 500);
    return serverErrorResponse();
  }
};

const poAccess = withAnyPermission("manage:inventory", "submit:org_orders");

export const GET = withStaffAuth(poAccess(getHandler));
