import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import { withPermission } from "@/lib/middleware/withPermission";
import { cloneProduct } from "@/lib/services/product.service";
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const postHandler = async (_req: AuthedRequest, ctx: unknown) => {
  try {
    const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
    const product = await cloneProduct(id);
    return successResponse(product, "Product cloned", 201);
  } catch (error) {
    if (error instanceof Error) return errorResponse(error.message);
    return serverErrorResponse();
  }
};

export const POST = withStaffAuth(withPermission("manage:products")(postHandler));
