import { withAuth } from "@/lib/middleware/withAuth";
import { withTenant } from "@/lib/middleware/withTenant";
import { withPermission } from "@/lib/middleware/withPermission";
import { getMemberById, updateMember, deleteMember } from "@/lib/services/member.service";
import { updateMemberSchema } from "@/lib/validations/member.schema";
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  serverErrorResponse,
} from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const getHandler = async (req: AuthedRequest, ctx: unknown) => {
  try {
    const { id } = (ctx as { params: { id: string } }).params;
    const member = await getMemberById(req.user.tenantId, id);
    if (!member) return notFoundResponse("Member not found");
    return successResponse(member);
  } catch {
    return serverErrorResponse();
  }
};

const patchHandler = async (req: AuthedRequest, ctx: unknown) => {
  try {
    const { id } = (ctx as { params: { id: string } }).params;
    const body = await req.json();
    const parsed = updateMemberSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues.map((e) => e.message).join(", "));

    const member = await updateMember(req.user.tenantId, id, parsed.data);
    if (!member) return notFoundResponse("Member not found");
    return successResponse(member, "Member updated");
  } catch (error) {
    if (error instanceof Error) return errorResponse(error.message);
    return serverErrorResponse();
  }
};

const deleteHandler = async (req: AuthedRequest, ctx: unknown) => {
  try {
    const { id } = (ctx as { params: { id: string } }).params;
    await deleteMember(req.user.tenantId, id);
    return successResponse(null, "Member removed");
  } catch {
    return serverErrorResponse();
  }
};

export const GET = withAuth(withTenant(getHandler));
export const PATCH = withAuth(withTenant(withPermission("manage:members")(patchHandler)));
export const DELETE = withAuth(withTenant(withPermission("manage:members")(deleteHandler)));
