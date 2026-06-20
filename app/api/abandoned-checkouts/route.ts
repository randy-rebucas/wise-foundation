import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import { withPermission } from "@/lib/middleware/withPermission";
import { getAbandonedCheckouts } from "@/lib/services/abandonedCheckout.service";
import { successResponse, serverErrorResponse } from "@/lib/utils/apiResponse";
import { parsePagination } from "@/lib/utils/pagination";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const getHandler = async (req: AuthedRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status");
    const status = statusParam === "open" || statusParam === "recovered" ? statusParam : undefined;
    const search = searchParams.get("search") ?? undefined;
    const { page, limit } = parsePagination(searchParams);

    const result = await getAbandonedCheckouts(status, search, page, limit);
    return successResponse(result.checkouts, undefined, 200, {
      page,
      limit,
      total: result.total,
      openCount: result.openCount,
    });
  } catch {
    return serverErrorResponse();
  }
};

export const GET = withStaffAuth(withPermission("manage:orders")(getHandler));
