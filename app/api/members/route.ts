import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import { withPermission } from "@/lib/middleware/withPermission";
import { getPublicAppSettings } from "@/lib/services/appSettings.service";
import { assertBranchAssignableForMemberCreate, getMembers, createMember } from "@/lib/services/member.service";
import { createMemberSchema } from "@/lib/validations/member.schema";
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/utils/apiResponse";
import { parsePagination } from "@/lib/utils/pagination";
import { requireBranchAccessIfPresent } from "@/lib/utils/branchAccess";
import { branchAccessErrorResponse } from "@/lib/utils/apiBranchErrors";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const getHandler = async (req: AuthedRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") ?? undefined;
    const status = searchParams.get("status") ?? undefined;
    const branchFromQuery = searchParams.get("branchId") ?? undefined;
    const { page, limit } = parsePagination(searchParams);

    const organizationId =
      req.user.role === "ORG_ADMIN" ? (req.user.organizationId ?? undefined) : undefined;

    let branchId = branchFromQuery;
    if (branchId) {
      branchId = (await requireBranchAccessIfPresent(req.user, branchId)) ?? undefined;
    }
    if (!organizationId && req.user.role !== "ADMIN") {
      branchId = branchId ?? req.user.branchIds?.[0] ?? undefined;
    }

    if (!organizationId && req.user.role !== "ADMIN" && !branchId) {
      return successResponse([], undefined, 200, {
        page,
        limit,
        total: 0,
        activeCount: 0,
        inactiveCount: 0,
      });
    }

    const result = await getMembers(search, status, branchId, page, limit, organizationId);
    return successResponse(result.members, undefined, 200, {
      page,
      limit,
      total: result.total,
      activeCount: result.activeCount,
      inactiveCount: result.inactiveCount,
    });
  } catch (err) {
    const branchErr = branchAccessErrorResponse(err);
    if (branchErr) return branchErr;
    return serverErrorResponse();
  }
};

const postHandler = async (req: AuthedRequest) => {
  try {
    const body = await req.json();
    const parsed = createMemberSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(parsed.error.issues.map((e) => e.message).join(", "));
    }

    const appSettings = await getPublicAppSettings();
    const discountPercent =
      parsed.data.discountPercent ?? appSettings.memberDefaultDiscountPercent;

    await assertBranchAssignableForMemberCreate(parsed.data.branchId, req.user);

    const payload = { ...parsed.data, discountPercent };
    if (req.user.role === "ORG_ADMIN" && req.user.organizationId) {
      payload.organizationId = req.user.organizationId;
    } else if (req.user.role !== "ADMIN") {
      // Only platform admins may tag a member with an arbitrary organization; other
      // branch-scoped roles have no organization context of their own to assign from.
      payload.organizationId = undefined;
    }

    const member = await createMember(payload, { id: req.user.id, name: req.user.name });
    return successResponse(member, "Member registered", 201);
  } catch (error) {
    if (error instanceof Error) return errorResponse(error.message);
    return serverErrorResponse();
  }
};

export const GET = withStaffAuth(
  withPermission("manage:members", { allowRoles: ["ORG_ADMIN"] })(getHandler)
);
export const POST = withStaffAuth(withPermission("manage:members")(postHandler));
