import { withAuth } from "@/lib/middleware/withAuth";
import { withPermission } from "@/lib/middleware/withPermission";
import { getCommissions, getCommissionSummary } from "@/lib/services/commission.service";
import { successResponse, serverErrorResponse } from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";
import type { CommissionStatus } from "@/lib/db/models/Commission";

const getHandler = async (req: AuthedRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    // ORG_ADMIN is always scoped to their own organization
    const organizationId =
      req.user.role === "ORG_ADMIN"
        ? (req.user.organizationId ?? undefined)
        : (searchParams.get("organizationId") ?? undefined);
    const status = searchParams.get("status") as CommissionStatus | null;
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "20");
    const summary = searchParams.get("summary") === "true";

    if (summary) {
      const data = await getCommissionSummary(organizationId);
      return successResponse(data);
    }

    const data = await getCommissions({ organizationId, status: status ?? undefined, page, limit });
    return successResponse(data.records, undefined, undefined, {
      page,
      limit,
      total: data.total,
      totalPages: data.pages,
    });
  } catch {
    return serverErrorResponse();
  }
};

export const GET = withAuth(withPermission("manage:organizations", { allowRoles: ["ORG_ADMIN"] })(getHandler));
