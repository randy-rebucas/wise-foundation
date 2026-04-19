import { withAuth } from "@/lib/middleware/withAuth";
import { withPermission } from "@/lib/middleware/withPermission";
import { getStockMovements, getStockMovementsByOrg, processStockMovement } from "@/lib/services/inventory.service";
import { stockMovementSchema } from "@/lib/validations/inventory.schema";
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const getHandler = async (req: AuthedRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId") ?? undefined;
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "20");

    if (req.user.role === "ORG_ADMIN" && req.user.organizationId) {
      const result = await getStockMovementsByOrg(req.user.organizationId, productId, page, limit);
      return successResponse(result.movements, undefined, 200, { page, limit, total: result.total });
    }

    const branchId = searchParams.get("branchId") ?? req.user.branchIds[0];
    if (!branchId) return errorResponse("Branch ID is required");

    const result = await getStockMovements(branchId, productId, page, limit);
    return successResponse(result.movements, undefined, 200, {
      page,
      limit,
      total: result.total,
    });
  } catch {
    return serverErrorResponse();
  }
};

const postHandler = async (req: AuthedRequest) => {
  try {
    const body = await req.json();
    const branchId = body.branchId ?? req.user.branchIds[0];

    if (!branchId) return errorResponse("Branch ID is required");

    const parsed = stockMovementSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues.map((e) => e.message).join(", "));
    }

    const result = await processStockMovement(branchId, req.user.id, parsed.data);

    return successResponse(result, "Stock movement processed", 201);
  } catch (error) {
    if (error instanceof Error) return errorResponse(error.message);
    return serverErrorResponse();
  }
};

export const GET = withAuth(getHandler);
export const POST = withAuth(withPermission("manage:inventory")(postHandler));
