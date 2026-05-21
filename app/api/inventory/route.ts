import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import { withPermission } from "@/lib/middleware/withPermission";
import { getInventory } from "@/lib/services/inventory.service";
import { getOrgInventoryPaged } from "@/lib/services/organizationInventory.service";
import { assertInventoryAccessForUser } from "@/lib/organization/capabilities";
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/utils/apiResponse";
import { resolveInventoryBranchId } from "@/lib/utils/resolveInventoryBranchId";
import { branchAccessErrorResponse } from "@/lib/utils/apiBranchErrors";
import { orgCapabilityErrorResponse } from "@/lib/utils/orgCapabilityErrors";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const getHandler = async (req: AuthedRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "20");
    const lowStockOnly = searchParams.get("lowStock") === "true";

    if (req.user.role === "ORG_ADMIN" && req.user.organizationId) {
      const caps = await assertInventoryAccessForUser(req.user);
      if (caps?.inventorySurface === "organization") {
        const result = await getOrgInventoryPaged(
          req.user.organizationId,
          page,
          limit,
          lowStockOnly
        );
        return successResponse(result.items, undefined, 200, {
          page,
          limit,
          total: result.total,
          inventoryMode: "organization",
        });
      }
      // franchise: fall through to branch inventory
    }

    const branchId = await resolveInventoryBranchId(searchParams.get("branchId"), req.user);
    if (!branchId) return errorResponse("Branch ID is required");

    const result = await getInventory(branchId, page, limit, lowStockOnly);
    return successResponse(result.items, undefined, 200, {
      page,
      limit,
      total: result.total,
      inventoryMode: "branch",
    });
  } catch (err) {
    const capErr = orgCapabilityErrorResponse(err);
    if (capErr) return capErr;
    const branchErr = branchAccessErrorResponse(err);
    if (branchErr) return branchErr;
    return serverErrorResponse();
  }
};

export const GET = withStaffAuth(withPermission("manage:inventory")(getHandler));
