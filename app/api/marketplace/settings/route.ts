import { getPublicAppSettings } from "@/lib/services/appSettings.service";
import { serverErrorResponse, successResponse } from "@/lib/utils/apiResponse";

export async function GET() {
  try {
    const data = await getPublicAppSettings();
    const res = successResponse(data);
    res.headers.set("Cache-Control", "public, s-maxage=120, stale-while-revalidate=600");
    return res;
  } catch {
    return serverErrorResponse("Unable to load store settings");
  }
}
