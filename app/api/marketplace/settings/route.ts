import { getPublicAppSettings } from "@/lib/services/appSettings.service";
import { serverErrorResponse, successResponse } from "@/lib/utils/apiResponse";

export async function GET() {
  try {
    const data = await getPublicAppSettings();
    return successResponse(data);
  } catch {
    return serverErrorResponse("Unable to load store settings");
  }
}
