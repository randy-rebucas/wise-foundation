import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import { withPermission } from "@/lib/middleware/withPermission";
import { getCoupons, createManualCoupon } from "@/lib/services/coupon.service";
import { createCouponSchema } from "@/lib/validations/coupon.schema";
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
} from "@/lib/utils/apiResponse";
import { parsePagination } from "@/lib/utils/pagination";
import type { AuthedRequest } from "@/lib/middleware/withAuth";
import type { CouponSource } from "@/lib/db/models/Coupon";

const getHandler = async (req: AuthedRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const { page, limit } = parsePagination(searchParams);
    const source = searchParams.get("source") as CouponSource | null;
    const isActive = searchParams.get("isActive");
    const search = searchParams.get("search") ?? undefined;

    const result = await getCoupons(
      {
        source: source ?? undefined,
        isActive: isActive !== null ? isActive === "true" : undefined,
        search,
      },
      page,
      limit
    );

    return successResponse(result.coupons, undefined, 200, {
      page,
      limit,
      total: result.total,
    });
  } catch {
    return serverErrorResponse();
  }
};

const postHandler = async (req: AuthedRequest) => {
  try {
    const body = await req.json();
    const parsed = createCouponSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(parsed.error.issues.map((e) => e.message).join(", "));
    }

    const coupon = await createManualCoupon(parsed.data, { id: req.user.id, name: req.user.name });
    return successResponse(coupon, "Promo created", 201);
  } catch (error) {
    if (error instanceof Error) return errorResponse(error.message);
    return serverErrorResponse();
  }
};

export const GET = withStaffAuth(withPermission("manage:promotions")(getHandler));
export const POST = withStaffAuth(withPermission("manage:promotions")(postHandler));
