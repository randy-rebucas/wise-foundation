import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import {
  getAdminAppSettingsExtras,
  getPublicAppSettings,
  updateAppSettings,
} from "@/lib/services/appSettings.service";
import { patchAppSettingsSchema } from "@/lib/validations/appSettings.schema";
import {
  successResponse,
  errorResponse,
  forbiddenResponse,
  serverErrorResponse,
} from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const getHandler = async (req: AuthedRequest) => {
  void req;
  try {
    const settings = await getPublicAppSettings();
    if (req.user.role === "ADMIN") {
      const extras = await getAdminAppSettingsExtras();
      return successResponse({ ...settings, ...extras });
    }
    return successResponse(settings);
  } catch {
    return serverErrorResponse();
  }
};

const patchHandler = async (req: AuthedRequest) => {
  if (req.user.role !== "ADMIN") {
    return forbiddenResponse("Only administrators can update application settings");
  }
  try {
    const body = await req.json();
    const parsed = patchAppSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues.map((e) => e.message).join(", "));
    }
    if (Object.keys(parsed.data).length === 0) {
      return errorResponse("No fields to update");
    }
    const settings = await updateAppSettings(parsed.data, { id: req.user.id, name: req.user.name });
    return successResponse(settings, "Application settings updated");
  } catch (e) {
    if (e instanceof Error) return errorResponse(e.message);
    return serverErrorResponse();
  }
};

export const GET = withStaffAuth(getHandler);
export const PATCH = withStaffAuth(patchHandler);
