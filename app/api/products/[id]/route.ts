import { withAuth } from "@/lib/middleware/withAuth";
import { withTenant } from "@/lib/middleware/withTenant";
import { withPermission } from "@/lib/middleware/withPermission";
import { getProductById, updateProduct, deleteProduct } from "@/lib/services/product.service";
import { updateProductSchema } from "@/lib/validations/product.schema";
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  serverErrorResponse,
} from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const getHandler = async (req: AuthedRequest, ctx: unknown) => {
  try {
    const { id } = (ctx as { params: { id: string } }).params;
    const product = await getProductById(req.user.tenantId, id);
    if (!product) return notFoundResponse("Product not found");
    return successResponse(product);
  } catch {
    return serverErrorResponse();
  }
};

const patchHandler = async (req: AuthedRequest, ctx: unknown) => {
  try {
    const { id } = (ctx as { params: { id: string } }).params;
    const body = await req.json();
    const parsed = updateProductSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues.map((e) => e.message).join(", "));

    const product = await updateProduct(req.user.tenantId, id, parsed.data);
    if (!product) return notFoundResponse("Product not found");
    return successResponse(product, "Product updated");
  } catch (error) {
    if (error instanceof Error) return errorResponse(error.message);
    return serverErrorResponse();
  }
};

const deleteHandler = async (req: AuthedRequest, ctx: unknown) => {
  try {
    const { id } = (ctx as { params: { id: string } }).params;
    await deleteProduct(req.user.tenantId, id);
    return successResponse(null, "Product deleted");
  } catch {
    return serverErrorResponse();
  }
};

export const GET = withAuth(withTenant(getHandler));
export const PATCH = withAuth(withTenant(withPermission("manage:products")(patchHandler)));
export const DELETE = withAuth(withTenant(withPermission("manage:products")(deleteHandler)));
