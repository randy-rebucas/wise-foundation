import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
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
import { requireBranchAccessIfPresent } from "@/lib/utils/branchAccess";
import { branchAccessErrorResponse } from "@/lib/utils/apiBranchErrors";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const getHandler = async (req: AuthedRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") ?? "summary";
    const branchId =
      (await requireBranchAccessIfPresent(req.user, searchParams.get("branchId"))) ?? undefined;
    const days = Math.min(Math.max(parseInt(searchParams.get("days") ?? "30") || 30, 1), 365);

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
  } catch (err) {
    const branchErr = branchAccessErrorResponse(err);
    if (branchErr) return branchErr;
    return serverErrorResponse();
  }
};

export const GET = withStaffAuth(withPermission("view:reports")(getHandler));
