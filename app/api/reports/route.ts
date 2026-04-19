import { withAuth } from "@/lib/middleware/withAuth";
import { withPermission } from "@/lib/middleware/withPermission";
import {
  getSalesSummary,
  getTopProducts,
  getBranchPerformance,
  getInventoryAlerts,
  getMemberStats,
  getOrgSalesSummary,
  getTopOrganizations,
  getDistributionSummary,
  getOrgInventorySummary,
} from "@/lib/services/report.service";
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const getHandler = async (req: AuthedRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") ?? "summary";
    const branchId = searchParams.get("branchId") ?? undefined;
    const days = parseInt(searchParams.get("days") ?? "30");

    const organizationId =
      req.user.role === "ORG_ADMIN"
        ? (req.user.organizationId ?? undefined)
        : (searchParams.get("organizationId") ?? undefined);

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
      case "org-sales":
        return successResponse(await getOrgSalesSummary(organizationId, days));
      case "top-organizations":
        return successResponse(await getTopOrganizations(days));
      case "distribution-summary":
        return successResponse(await getDistributionSummary(days));
      case "org-inventory":
        return successResponse(await getOrgInventorySummary(organizationId));
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
      case "org-summary": {
        const [orgSales, topOrgs, distribution, orgInventory] = await Promise.all([
          getOrgSalesSummary(organizationId, days),
          getTopOrganizations(days),
          getDistributionSummary(days),
          getOrgInventorySummary(organizationId),
        ]);
        return successResponse({ orgSales, topOrgs, distribution, orgInventory });
      }
      default:
        return errorResponse("Invalid report type");
    }
  } catch {
    return serverErrorResponse();
  }
};

export const GET = withAuth(withPermission("view:reports")(getHandler));
