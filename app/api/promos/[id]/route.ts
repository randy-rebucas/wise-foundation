import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import { withPermission } from "@/lib/middleware/withPermission";
import { getCouponById, updateCoupon, deleteCoupon } from "@/lib/services/coupon.service";
import { updateCouponSchema } from "@/lib/validations/coupon.schema";
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  serverErrorResponse,
} from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const getHandler = async (req: AuthedRequest, ctx: unknown) => {
  try {
    const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
    const coupon = await getCouponById(id);
    if (!coupon) return notFoundResponse("Promo not found");
    return successResponse(coupon);
  } catch {
    return serverErrorResponse();
  }
};

const patchHandler = async (req: AuthedRequest, ctx: unknown) => {
  try {
    const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
    const body = await req.json();
    const parsed = updateCouponSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues.map((e) => e.message).join(", "));

    const coupon = await updateCoupon(id, parsed.data, { id: req.user.id, name: req.user.name });
    if (!coupon) return notFoundResponse("Promo not found");
    return successResponse(coupon, "Promo updated");
  } catch (error) {
    if (error instanceof Error) return errorResponse(error.message);
    return serverErrorResponse();
  }
};

const deleteHandler = async (req: AuthedRequest, ctx: unknown) => {
  try {
    const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
    const coupon = await deleteCoupon(id, { id: req.user.id, name: req.user.name });
    if (!coupon) return notFoundResponse("Promo not found");
    return successResponse(null, "Promo deleted");
  } catch {
    return serverErrorResponse();
  }
};

export const GET = withStaffAuth(withPermission("manage:promotions")(getHandler));
export const PATCH = withStaffAuth(withPermission("manage:promotions")(patchHandler));
export const DELETE = withStaffAuth(withPermission("manage:promotions")(deleteHandler));
