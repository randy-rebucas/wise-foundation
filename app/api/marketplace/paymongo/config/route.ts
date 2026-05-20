import { getPaymongoPublicKey, isPaymongoConfigured } from "@/lib/paymongo/config";
import { errorResponse, successResponse } from "@/lib/utils/apiResponse";

export async function GET() {
  try {
    return successResponse({
      enabled: isPaymongoConfigured(),
      publicKey: isPaymongoConfigured() ? getPaymongoPublicKey() : null,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to load PayMongo config";
    return errorResponse(msg, 500);
  }
}
