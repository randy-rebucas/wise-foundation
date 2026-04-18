import { withAuth } from "@/lib/middleware/withAuth";
import { withTenant } from "@/lib/middleware/withTenant";
import { withPermission } from "@/lib/middleware/withPermission";
import { getSuppliers, createSupplier } from "@/lib/services/supplier.service";
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const getHandler = async (req: AuthedRequest) => {
  try {
    const suppliers = await getSuppliers(req.user.tenantId);
    return successResponse(suppliers);
  } catch {
    return serverErrorResponse();
  }
};

const postHandler = async (req: AuthedRequest) => {
  try {
    const body = await req.json();
    if (!body.name?.trim()) return errorResponse("Supplier name is required");
    const supplier = await createSupplier(req.user.tenantId, body);
    return successResponse(supplier, "Supplier created", 201);
  } catch {
    return serverErrorResponse();
  }
};

export const GET = withAuth(withTenant(withPermission("manage:inventory")(getHandler)));
export const POST = withAuth(withTenant(withPermission("manage:inventory")(postHandler)));
