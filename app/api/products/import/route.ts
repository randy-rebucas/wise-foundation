import { withAuth } from "@/lib/middleware/withAuth";
import { withPermission } from "@/lib/middleware/withPermission";
import { importProductsFromCsv } from "@/lib/services/product.service";
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const postHandler = async (req: AuthedRequest) => {
  try {
    const body = await req.json();
    if (typeof body.csv !== "string" || !body.csv.trim()) {
      return errorResponse('Request body must include a non-empty "csv" string.');
    }

    const result = await importProductsFromCsv(body.csv);
    return successResponse(result, "Import finished");
  } catch (error) {
    if (error instanceof Error) return errorResponse(error.message);
    return serverErrorResponse();
  }
};

export const POST = withAuth(withPermission("manage:products")(postHandler));
