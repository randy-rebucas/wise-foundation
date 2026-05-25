import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import { withPermission } from "@/lib/middleware/withPermission";
import { getAuditLogs } from "@/lib/services/audit.service";
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/utils/apiResponse";
import { parsePagination } from "@/lib/utils/pagination";
import type { AuditAction } from "@/lib/db/models/AuditLog";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const VALID_ACTIONS = new Set<AuditAction>([
  "user.created",
  "user.updated",
  "user.role_changed",
  "user.deleted",
  "user.locked",
  "settings.updated",
  "order.refunded",
  "organization.created",
  "organization.updated",
  "organization.deleted",
]);

const getHandler = async (req: AuthedRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const { page, limit } = parsePagination(searchParams);

    const actionParam = searchParams.get("action") ?? undefined;
    const action =
      actionParam && VALID_ACTIONS.has(actionParam as AuditAction)
        ? (actionParam as AuditAction)
        : undefined;

    const targetId = searchParams.get("targetId") ?? undefined;
    const performedBy = searchParams.get("performedBy") ?? undefined;

    const result = await getAuditLogs({ action, targetId, performedBy, page, limit });

    return successResponse(result.logs, undefined, 200, {
      page,
      limit,
      total: result.total,
      pages: result.pages,
    });
  } catch {
    return serverErrorResponse();
  }
};

export const GET = withStaffAuth(withPermission("manage:users")(getHandler));
