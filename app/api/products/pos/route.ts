import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import { withPermission } from "@/lib/middleware/withPermission";
import { assertPosAccessForUser } from "@/lib/organization/capabilities";
import { getProductsForPOS } from "@/lib/services/product.service";
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/utils/apiResponse";
import { resolveInventoryBranchId } from "@/lib/utils/resolveInventoryBranchId";
import { branchAccessErrorResponse } from "@/lib/utils/apiBranchErrors";
import { orgCapabilityErrorResponse } from "@/lib/utils/orgCapabilityErrors";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const getHandler = async (req: AuthedRequest) => {
  try {
    await assertPosAccessForUser(req.user);

    const { searchParams } = new URL(req.url);
    const branchId = await resolveInventoryBranchId(searchParams.get("branchId"), req.user);
    const search = searchParams.get("search") ?? undefined;

    if (!branchId) {
      return errorResponse(
        "Branch ID is required. Link a branch to your organization or select one."
      );
    }

    const products = await getProductsForPOS(branchId, search);
    return successResponse(products);
  } catch (err) {
    const capErr = orgCapabilityErrorResponse(err);
    if (capErr) return capErr;
    const branchErr = branchAccessErrorResponse(err);
    if (branchErr) return branchErr;
    return serverErrorResponse();
  }
};

export const GET = withStaffAuth(withPermission("use:pos")(getHandler));
