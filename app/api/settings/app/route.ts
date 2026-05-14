import { withAuth } from "@/lib/middleware/withAuth";
import { getPublicAppSettings, updateAppSettings } from "@/lib/services/appSettings.service";
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
    const settings = await updateAppSettings(parsed.data);
    return successResponse(settings, "Application settings updated");
  } catch (e) {
    if (e instanceof Error) return errorResponse(e.message);
    return serverErrorResponse();
  }
};

export const GET = withAuth(getHandler);
export const PATCH = withAuth(patchHandler);
