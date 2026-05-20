import { isJntConfigured } from "@/lib/jnt/config";
import { errorResponse, successResponse } from "@/lib/utils/apiResponse";

export async function GET() {
  try {
    return successResponse({ enabled: isJntConfigured() });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to load J&T config";
    return errorResponse(msg, 500);
  }
}
