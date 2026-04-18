import { withSuperAdmin } from "@/lib/middleware/withSuperAdmin";
import { getTenantTransactions } from "@/lib/services/superadmin.service";
import { successResponse, serverErrorResponse } from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const getHandler = async (req: AuthedRequest, ctx?: unknown) => {
  try {
    const { id } = await (ctx as RouteContext).params;
    const { searchParams } = new URL(req.url);

    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "20");
    const type = searchParams.get("type") ?? undefined;
    const paymentMethod = searchParams.get("paymentMethod") ?? undefined;
    const dateFrom = searchParams.get("dateFrom") ?? undefined;
    const dateTo = searchParams.get("dateTo") ?? undefined;

    const result = await getTenantTransactions(id, page, limit, type, paymentMethod, dateFrom, dateTo);
    return successResponse(result.transactions, undefined, 200, {
      page,
      limit,
      total: result.total,
      totalPages: result.pages,
    });
  } catch {
    return serverErrorResponse();
  }
};

export const GET = withSuperAdmin(getHandler);
