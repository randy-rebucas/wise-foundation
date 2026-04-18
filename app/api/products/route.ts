import { withAuth } from "@/lib/middleware/withAuth";
import { withPermission } from "@/lib/middleware/withPermission";
import { getProducts, createProduct } from "@/lib/services/product.service";
import { createProductSchema } from "@/lib/validations/product.schema";
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
} from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";
import type { ProductCategory } from "@/types";

const getHandler = async (req: AuthedRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "20");
    const category = searchParams.get("category") as ProductCategory | null;
    const search = searchParams.get("search") ?? undefined;
    const isActive = searchParams.get("isActive");

    const result = await getProducts(
      {
        category: category ?? undefined,
        search,
        isActive: isActive !== null ? isActive === "true" : undefined,
      },
      page,
      limit
    );

    return successResponse(result.products, undefined, 200, {
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
    const parsed = createProductSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(parsed.error.issues.map((e) => e.message).join(", "));
    }

    const product = await createProduct(parsed.data);
    return successResponse(product, "Product created", 201);
  } catch (error) {
    if (error instanceof Error) return errorResponse(error.message);
    return serverErrorResponse();
  }
};

export const GET = withAuth(getHandler);
export const POST = withAuth(withPermission("manage:products")(postHandler));
