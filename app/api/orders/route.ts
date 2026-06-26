import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import { withPermission } from "@/lib/middleware/withPermission";
import { assertPosAccessForUser } from "@/lib/organization/capabilities";
import { processCheckout } from "@/lib/services/pos.service";
import { getOrders } from "@/lib/services/order.service";
import { checkoutSchema } from "@/lib/validations/order.schema";
import { successResponse, errorResponse, forbiddenResponse, serverErrorResponse } from "@/lib/utils/apiResponse";
import { parsePagination } from "@/lib/utils/pagination";
import { resolveInventoryBranchId } from "@/lib/utils/resolveInventoryBranchId";
import { requireBranchAccessIfPresent } from "@/lib/utils/branchAccess";
import { branchAccessErrorResponse } from "@/lib/utils/apiBranchErrors";
import { orgCapabilityErrorResponse } from "@/lib/utils/orgCapabilityErrors";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const getHandler = async (req: AuthedRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const memberId = searchParams.get("memberId") ?? undefined;
    const perms = req.user.permissions ?? [];
    const canOrders = perms.includes("manage:orders");
    const canMemberHistory = !!memberId && perms.includes("manage:members");
    if (!canOrders && !canMemberHistory) {
      return forbiddenResponse();
    }

    const status = searchParams.get("status") ?? undefined;
    const type = searchParams.get("type") ?? undefined;
    const { page, limit } = parsePagination(searchParams);

    const organizationId =
      req.user.role === "ORG_ADMIN" ? (req.user.organizationId ?? undefined) : undefined;

    let branchId: string | undefined;
    if (organizationId) {
      branchId = (await requireBranchAccessIfPresent(req.user, searchParams.get("branchId"))) ?? undefined;
    } else if (req.user.role === "ADMIN") {
      // ADMIN may omit branchId to see all orders (including org-scoped B2B with branchId=null).
      // If an explicit branchId is supplied, validate and scope to it.
      const raw = searchParams.get("branchId");
      if (raw) {
        const resolved = await resolveInventoryBranchId(raw, req.user);
        if (!resolved) return errorResponse("Branch ID is required");
        branchId = resolved;
      }
    } else {
      const resolved = await resolveInventoryBranchId(searchParams.get("branchId"), req.user);
      if (!resolved) return errorResponse("Branch ID is required");
      branchId = resolved;
    }

    const result = await getOrders(branchId, { status, type, memberId }, page, limit, organizationId);
    return successResponse(result.orders, undefined, 200, {
      page,
      limit,
      total: result.total,
      pendingCount: result.pendingCount,
      approvedCount: result.approvedCount,
    });
  } catch (err) {
    const branchErr = branchAccessErrorResponse(err);
    if (branchErr) return branchErr;
    return serverErrorResponse();
  }
};

const postHandler = async (req: AuthedRequest) => {
  try {
    await assertPosAccessForUser(req.user);

    const body = await req.json();
    const parsed = checkoutSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(parsed.error.issues.map((e) => e.message).join(", "));
    }

    const branchId = await resolveInventoryBranchId(parsed.data.branchId, req.user);
    if (!branchId) return errorResponse("Branch ID is required");

    const result = await processCheckout({
      branchId,
      cashierId: req.user.id,
      items: parsed.data.items.map((i) => ({ ...i, variantId: i.variantId ?? undefined })),
      memberId: parsed.data.memberId,
      discountPercent: parsed.data.discountPercent,
      paymentMethod: parsed.data.paymentMethod,
      amountPaid: parsed.data.amountPaid,
      notes: parsed.data.notes,
      shippingFee: parsed.data.shippingFee,
    });

    return successResponse(result, "Order completed", 201);
  } catch (error) {
    const capErr = orgCapabilityErrorResponse(error);
    if (capErr) return capErr;
    const branchErr = branchAccessErrorResponse(error);
    if (branchErr) return branchErr;
    if (error instanceof Error) return errorResponse(error.message);
    return serverErrorResponse();
  }
};

export const GET = withStaffAuth(getHandler);
export const POST = withStaffAuth(withPermission("use:pos")(postHandler));
