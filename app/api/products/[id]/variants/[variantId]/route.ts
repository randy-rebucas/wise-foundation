import { withAuth } from "@/lib/middleware/withAuth";
import { withPermission } from "@/lib/middleware/withPermission";
import { updateProductVariant, deleteProductVariant } from "@/lib/services/product.service";
import { updateVariantSchema } from "@/lib/validations/product.schema";
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  serverErrorResponse,
} from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const patchHandler = async (req: AuthedRequest, ctx: unknown) => {
  try {
    const { variantId } = (ctx as { params: { variantId: string } }).params;
    const body = await req.json();
    const parsed = updateVariantSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues.map((e) => e.message).join(", "));

    const variant = await updateProductVariant(variantId, parsed.data);
    if (!variant) return notFoundResponse("Variant not found");
    return successResponse(variant, "Variant updated");
  } catch (error) {
    if (error instanceof Error) return errorResponse(error.message);
    return serverErrorResponse();
  }
};

const deleteHandler = async (req: AuthedRequest, ctx: unknown) => {
  try {
    const { variantId } = (ctx as { params: { variantId: string } }).params;
    await deleteProductVariant(variantId);
    return successResponse(null, "Variant deleted");
  } catch {
    return serverErrorResponse();
  }
};

export const PATCH = withAuth(withPermission("manage:products")(patchHandler));
export const DELETE = withAuth(withPermission("manage:products")(deleteHandler));
