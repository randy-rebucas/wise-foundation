import { withAuth } from "@/lib/middleware/withAuth";
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
        return successResponse(await getSalesSummary(branchId, days));
      case "top-products":
        return successResponse(await getTopProducts(branchId));
      case "branch-performance":
        return successResponse(await getBranchPerformance());
      case "inventory-alerts":
        return successResponse(await getInventoryAlerts());
      case "member-stats":
        return successResponse(await getMemberStats());
      case "summary": {
        const [sales, topProducts, branchPerf, alerts, memberStats] = await Promise.all([
          getSalesSummary(branchId, days),
          getTopProducts(branchId, 5),
          getBranchPerformance(),
          getInventoryAlerts(),
          getMemberStats(),
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

export const GET = withAuth(withPermission("view:reports")(getHandler));
