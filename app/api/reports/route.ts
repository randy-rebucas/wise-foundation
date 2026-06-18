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
import { successResponse, errorResponse, forbiddenResponse, serverErrorResponse } from "@/lib/utils/apiResponse";
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
        : req.user.role === "ADMIN"
          ? (searchParams.get("organizationId") ?? undefined)
          : undefined;

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
        if (req.user.role !== "ADMIN") return forbiddenResponse("Admin only");
        return successResponse(await getTopOrganizations(days));
      case "distribution-summary":
        if (req.user.role !== "ADMIN") return forbiddenResponse("Admin only");
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
        // topOrgs names and ranks every organization's revenue/commissions — admin only.
        // distribution's org-type counts/revenue are platform aggregates (fine to share),
        // but its commissions figure must be scoped to the caller's own org, not the platform total.
        const isAdmin = req.user.role === "ADMIN";
        const [orgSales, topOrgs, distribution, orgInventory] = await Promise.all([
          getOrgSalesSummary(organizationId, days),
          isAdmin ? getTopOrganizations(days) : Promise.resolve([]),
          // Non-admin, non-org callers (e.g. branch staff) have no organization of their
          // own — scope to a sentinel that matches no Commission doc instead of falling
          // back to the platform-wide total.
          getDistributionSummary(days, isAdmin ? undefined : organizationId ?? "__none__"),
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
