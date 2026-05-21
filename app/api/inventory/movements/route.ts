import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import { withPermission } from "@/lib/middleware/withPermission";
import { getStockMovements, getStockMovementsByOrg, processStockMovement } from "@/lib/services/inventory.service";
import { assertInventoryAccessForUser } from "@/lib/organization/capabilities";
import { stockMovementSchema } from "@/lib/validations/inventory.schema";
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/utils/apiResponse";
import { resolveInventoryBranchId } from "@/lib/utils/resolveInventoryBranchId";
import { branchAccessErrorResponse } from "@/lib/utils/apiBranchErrors";
import { orgCapabilityErrorResponse } from "@/lib/utils/orgCapabilityErrors";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const getHandler = async (req: AuthedRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId") ?? undefined;
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "20");

    if (req.user.role === "ORG_ADMIN" && req.user.organizationId) {
      const caps = await assertInventoryAccessForUser(req.user);
      if (caps?.inventorySurface === "organization") {
        const result = await getStockMovementsByOrg(req.user.organizationId, productId, page, limit);
        return successResponse(result.movements, undefined, 200, { page, limit, total: result.total });
      }
    }

    const branchId = await resolveInventoryBranchId(searchParams.get("branchId"), req.user);
    if (!branchId) return errorResponse("Branch ID is required");

    const result = await getStockMovements(branchId, productId, page, limit);
    return successResponse(result.movements, undefined, 200, {
      page,
      limit,
      total: result.total,
    });
  } catch (err) {
    const capErr = orgCapabilityErrorResponse(err);
    if (capErr) return capErr;
    const branchErr = branchAccessErrorResponse(err);
    if (branchErr) return branchErr;
    return serverErrorResponse();
  }
};

const postHandler = async (req: AuthedRequest) => {
  try {
    if (req.user.role === "ORG_ADMIN" && req.user.organizationId) {
      const caps = await assertInventoryAccessForUser(req.user);
      if (caps?.inventorySurface === "organization") {
        return errorResponse(
          "Manual branch stock movements are not used for distributor inventory. Use purchase orders or org transfers."
        );
      }
    }

    const body = await req.json();
    const branchId = await resolveInventoryBranchId(body.branchId, req.user);

    if (!branchId) return errorResponse("Branch ID is required");

    const parsed = stockMovementSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues.map((e) => e.message).join(", "));
    }

    const result = await processStockMovement(branchId, req.user.id, parsed.data);

    return successResponse(result, "Stock movement processed", 201);
  } catch (error) {
    const capErr = orgCapabilityErrorResponse(error);
    if (capErr) return capErr;
    const branchErr = branchAccessErrorResponse(error);
    if (branchErr) return branchErr;
    if (error instanceof Error) return errorResponse(error.message);
    return serverErrorResponse();
  }
};

export const GET = withStaffAuth(withPermission("manage:inventory")(getHandler));
export const POST = withStaffAuth(withPermission("manage:inventory")(postHandler));
