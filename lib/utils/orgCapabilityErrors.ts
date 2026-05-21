import { forbiddenResponse, errorResponse } from "@/lib/utils/apiResponse";
import { isOrganizationCapabilityError } from "@/lib/organization/capabilities";

export function orgCapabilityErrorResponse(err: unknown): Response | null {
  if (!isOrganizationCapabilityError(err)) return null;
  return forbiddenResponse(err.message);
}
