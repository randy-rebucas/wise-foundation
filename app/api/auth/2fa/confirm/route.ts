import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import { confirmTotpSetup } from "@/lib/services/totp.service";
import { writeAuditLog } from "@/lib/services/audit.service";
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const handler = async (req: AuthedRequest) => {
  try {
    const body = (await req.json()) as { token?: unknown };
    if (typeof body.token !== "string" || !body.token.trim()) {
      return errorResponse('Body must include "token" (6-digit TOTP code)');
    }
    const { backupCodes } = await confirmTotpSetup(req.user.id, body.token.trim());
    void writeAuditLog({
      action: "user.2fa_enabled",
      actor: { id: req.user.id, name: req.user.name },
      targetId: req.user.id,
      targetType: "User",
    });
    return successResponse(
      { backupCodes },
      "2FA enabled. Save your backup codes — they will not be shown again."
    );
  } catch (err) {
    if (err instanceof Error) return errorResponse(err.message);
    return serverErrorResponse();
  }
};

export const POST = withStaffAuth(handler);
