import { withAuth } from "@/lib/middleware/withAuth";
import { withPermission } from "@/lib/middleware/withPermission";
import { getOrgPermissions, setOrgPermission } from "@/lib/services/orgPermission.service";
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";
import type { OrgPermissionKey } from "@/lib/db/models/OrgPermission";

const VALID_PERMISSIONS: OrgPermissionKey[] = [
  "sell:retail",
  "distribute:stock",
  "has:inventory",
  "earn:commission",
  "submit:orders",
];

const getHandler = async (req: AuthedRequest, ctx: unknown) => {
  try {
    const { id } = (ctx as { params: { id: string } }).params;
    const permissions = await getOrgPermissions(id);
    return successResponse(permissions);
  } catch {
    return serverErrorResponse();
  }
};

const postHandler = async (req: AuthedRequest, ctx: unknown) => {
  try {
    const { id } = (ctx as { params: { id: string } }).params;
    const body = await req.json();

    if (!VALID_PERMISSIONS.includes(body.permission)) {
      return errorResponse(`Invalid permission. Valid: ${VALID_PERMISSIONS.join(", ")}`);
    }
    if (typeof body.isGranted !== "boolean") {
      return errorResponse("isGranted must be a boolean");
    }

    const record = await setOrgPermission(
      id,
      body.permission as OrgPermissionKey,
      body.isGranted,
      req.user.id,
      { expiresAt: body.expiresAt ? new Date(body.expiresAt) : null, notes: body.notes }
    );

    return successResponse(record, `Permission ${body.isGranted ? "granted" : "revoked"}`);
  } catch (error) {
    if (error instanceof Error) return errorResponse(error.message);
    return serverErrorResponse();
  }
};

export const GET = withAuth(withPermission("manage:organizations")(getHandler));
export const POST = withAuth(withPermission("manage:organizations")(postHandler));
