import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import { changeUserPassword } from "@/lib/services/user.service";
import { changePasswordSchema } from "@/lib/validations/auth.schema";
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
} from "@/lib/utils/apiResponse";
import { writeAuditLog } from "@/lib/services/audit.service";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const patchHandler = async (req: AuthedRequest) => {
  try {
    const body = await req.json();
    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues.map((e) => e.message).join(", "));
    }

    await changeUserPassword(req.user.id, parsed.data.currentPassword, parsed.data.newPassword);

    void writeAuditLog({
      action: "user.password_changed",
      actor: { id: req.user.id, name: req.user.name },
      targetId: req.user.id,
      targetType: "User",
    });

    return successResponse(null, "Password changed successfully");
  } catch (error) {
    if (error instanceof Error) return errorResponse(error.message);
    return serverErrorResponse();
  }
};

export const PATCH = withStaffAuth(patchHandler);
