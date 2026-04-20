import { withAuth } from "@/lib/middleware/withAuth";
import { withPermission } from "@/lib/middleware/withPermission";
import { getSuppliers, createSupplier } from "@/lib/services/supplier.service";
import { createSupplierSchema } from "@/lib/validations/supplier.schema";
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const getHandler = async (req: AuthedRequest) => {
  try {
    const suppliers = await getSuppliers();
    return successResponse(suppliers);
  } catch {
    return serverErrorResponse();
  }
};

const postHandler = async (req: AuthedRequest) => {
  try {
    const body = await req.json();
    const parsed = createSupplierSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues.map((e) => e.message).join(", "));
    const supplier = await createSupplier(parsed.data);
    return successResponse(supplier, "Supplier created", 201);
  } catch {
    return serverErrorResponse();
  }
};

export const GET = withAuth(withPermission("manage:inventory")(getHandler));
export const POST = withAuth(withPermission("manage:inventory")(postHandler));
