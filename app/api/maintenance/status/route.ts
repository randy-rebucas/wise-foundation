import { auth } from "@/auth";
import { successResponse, serverErrorResponse } from "@/lib/utils/apiResponse";
import { getMaintenanceMode } from "@/lib/utils/maintenance";
import logger from "@/lib/logger";

export const GET = auth(async () => {
  try {
    const maintenanceMode = await getMaintenanceMode();
    return successResponse({
      maintenanceMode,
      message: maintenanceMode
        ? "System is currently under maintenance"
        : "System is running normally",
    });
  } catch (err) {
    logger.error({ err }, "[maintenance/status GET]");
    return serverErrorResponse();
  }
});
