import { withAuth } from "@/lib/middleware/withAuth";
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
    const product = await getProductById(id);
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

    const product = await updateProduct(id, parsed.data);
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
    await deleteProduct(id);
    return successResponse(null, "Product deleted");
  } catch {
    return serverErrorResponse();
  }
};

export const GET = withAuth(getHandler);
export const PATCH = withAuth(withPermission("manage:products")(patchHandler));
export const DELETE = withAuth(withPermission("manage:products")(deleteHandler));
