import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import { withAnyPermission } from "@/lib/middleware/withAnyPermission";
import logger from "@/lib/logger";
import {
  getDeliveries,
  getDeliveryStatusCounts,
  isDeliveryStatus,
} from "@/lib/services/delivery.service";
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const deliveryAccess = withAnyPermission("manage:inventory", "submit:org_orders");

const getHandler = async (req: AuthedRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get("branchId") ?? undefined;
    const organizationId = searchParams.get("organizationId") ?? undefined;
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const limit = parseInt(searchParams.get("limit") ?? "20", 10);
    const statusParam = searchParams.get("status") ?? "approved";

    if (!isDeliveryStatus(statusParam)) {
      return errorResponse("Status must be approved or received");
    }

    const [result, statusCounts] = await Promise.all([
      getDeliveries(req.user, statusParam, page, limit, { branchId, organizationId }),
      getDeliveryStatusCounts(req.user, { branchId, organizationId }),
    ]);

    return successResponse(result.orders, undefined, 200, {
      page,
      limit,
      total: result.total,
      statusCounts,
    });
  } catch (error) {
    logger.error({ err: error }, "[GET /api/deliveries]");
    if (error instanceof Error) return errorResponse(error.message, 500);
    return serverErrorResponse();
  }
};

export const GET = withStaffAuth(deliveryAccess(getHandler));
