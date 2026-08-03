import { anonymizeCustomerAccount } from "@/lib/services/user.service";
import { withCustomerRoute, errorResponse, successResponse } from "@/lib/utils/withCustomerRoute";
import { writeAuditLog } from "@/lib/services/audit.service";

export const DELETE = withCustomerRoute(async (userId, req) => {
  const body = (await req.json().catch(() => ({}))) as { confirm?: unknown };
  if (body.confirm !== true) {
    return errorResponse('Body must include "confirm": true to proceed with account deletion');
  }

  const user = await anonymizeCustomerAccount(userId);
  if (!user) return errorResponse("Account not found", 404);

  void writeAuditLog({
    action: "user.account_deleted",
    actor: { id: userId, name: user.name },
    targetId: userId,
    targetType: "User",
  });

  return successResponse(null, "Account deleted. Your personal data has been removed.");
});
