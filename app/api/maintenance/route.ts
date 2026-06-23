import { auth } from "@/auth";
import { setMaintenanceMode } from "@/lib/utils/maintenance";
import { successResponse, forbiddenResponse, serverErrorResponse } from "@/lib/utils/apiResponse";
import { writeAuditLog } from "@/lib/services/audit.service";
import logger from "@/lib/logger";

export const PATCH = auth(async (req) => {
  if (!req.auth?.user || req.auth.user.role !== "ADMIN") {
    return forbiddenResponse("Only administrators can change maintenance mode");
  }
  try {
    const body = await req.json();
    const enabled = Boolean(body?.enabled);
    await setMaintenanceMode(enabled);
    logger.info({ enabled, userId: req.auth.user.id }, "[maintenance PATCH] maintenance mode changed");
    void writeAuditLog({
      action: "settings.maintenance_toggled",
      actor: { id: req.auth.user.id, name: req.auth.user.name },
      targetType: "AppSettings",
      metadata: { enabled },
    });
    return successResponse(
      { maintenanceMode: enabled },
      enabled ? "Maintenance mode enabled" : "Maintenance mode disabled"
    );
  } catch (err) {
    logger.error({ err }, "[maintenance PATCH]");
    return serverErrorResponse();
  }
});
