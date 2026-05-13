import { auth } from "@/auth";
import { successResponse, serverErrorResponse } from "@/lib/utils/apiResponse";
import { isMaintenanceMode } from "@/lib/utils/maintenance";

export const GET = auth(async () => {
  try {
    return successResponse({
      maintenanceMode: isMaintenanceMode(),
      message: isMaintenanceMode()
        ? "System is currently under maintenance"
        : "System is running normally",
    });
  } catch (err) {
    console.error("[maintenance/status GET]", err);
    return serverErrorResponse();
  }
});
