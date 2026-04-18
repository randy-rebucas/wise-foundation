import { withAuth } from "@/lib/middleware/withAuth";
import { withPermission } from "@/lib/middleware/withPermission";
import { getProductVariants, createProductVariant } from "@/lib/services/product.service";
import { createVariantSchema } from "@/lib/validations/product.schema";
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const getHandler = async (req: AuthedRequest, ctx: unknown) => {
  try {
    const { id } = (ctx as { params: { id: string } }).params;
    const variants = await getProductVariants(id);
    return successResponse(variants);
  } catch {
    return serverErrorResponse();
  }
};

const postHandler = async (req: AuthedRequest, ctx: unknown) => {
  try {
    const { id } = (ctx as { params: { id: string } }).params;
    const body = await req.json();
    const parsed = createVariantSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues.map((e) => e.message).join(", "));

    const variant = await createProductVariant(id, parsed.data);
    return successResponse(variant, "Variant created", 201);
  } catch (error) {
    if (error instanceof Error) return errorResponse(error.message);
    return serverErrorResponse();
  }
};

export const GET = withAuth(getHandler);
export const POST = withAuth(withPermission("manage:products")(postHandler));
