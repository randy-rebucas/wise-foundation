import { withAuth } from "@/lib/middleware/withAuth";
import { withTenant } from "@/lib/middleware/withTenant";
import { withPermission } from "@/lib/middleware/withPermission";
import {
  getSalesSummary,
  getTopProducts,
  getBranchPerformance,
  getInventoryAlerts,
  getMemberStats,
} from "@/lib/services/report.service";
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const getHandler = async (req: AuthedRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") ?? "summary";
    const branchId = searchParams.get("branchId") ?? undefined;
    const days = parseInt(searchParams.get("days") ?? "30");

    switch (type) {
      case "sales":
        return successResponse(await getSalesSummary(req.user.tenantId, branchId, days));
      case "top-products":
        return successResponse(await getTopProducts(req.user.tenantId, branchId));
      case "branch-performance":
        return successResponse(await getBranchPerformance(req.user.tenantId));
      case "inventory-alerts":
        return successResponse(await getInventoryAlerts(req.user.tenantId));
      case "member-stats":
        return successResponse(await getMemberStats(req.user.tenantId));
      case "summary": {
        const [sales, topProducts, branchPerf, alerts, memberStats] = await Promise.all([
          getSalesSummary(req.user.tenantId, branchId, days),
          getTopProducts(req.user.tenantId, branchId, 5),
          getBranchPerformance(req.user.tenantId),
          getInventoryAlerts(req.user.tenantId),
          getMemberStats(req.user.tenantId),
        ]);
        return successResponse({ sales, topProducts, branchPerf, alerts, memberStats });
      }
      default:
        return errorResponse("Invalid report type");
    }
  } catch {
    return serverErrorResponse();
  }
};

export const GET = withAuth(withTenant(withPermission("view:reports")(getHandler)));
