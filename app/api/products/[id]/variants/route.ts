import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import { withPermission } from "@/lib/middleware/withPermission";
import { withAnyPermission } from "@/lib/middleware/withAnyPermission";
import { getProductVariants, createProductVariant } from "@/lib/services/product.service";
import { createVariantSchema } from "@/lib/validations/product.schema";
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const getHandler = async (req: AuthedRequest, ctx: unknown) => {
  try {
    const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
    const variants = await getProductVariants(id);
    return successResponse(variants);
  } catch {
    return serverErrorResponse();
  }
};

const postHandler = async (req: AuthedRequest, ctx: unknown) => {
  try {
    const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
    const body = await req.json();
    const parsed = createVariantSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues.map((e) => e.message).join(", "));

    const variant = await createProductVariant(id, parsed.data, { id: req.user.id, name: req.user.name });
    return successResponse(variant, "Variant created", 201);
  } catch (error) {
    if (error instanceof Error) return errorResponse(error.message);
    return serverErrorResponse();
  }
};

export const GET = withStaffAuth(
  withAnyPermission("manage:products", "submit:org_orders")(getHandler)
);
export const POST = withStaffAuth(withPermission("manage:products")(postHandler));
