import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import { withPermission } from "@/lib/middleware/withPermission";
import { successResponse, forbiddenResponse, serverErrorResponse } from "@/lib/utils/apiResponse";
import { parsePagination } from "@/lib/utils/pagination";
import { getSpinWheelCoupons } from "@/lib/services/coupon.service";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const getHandler = async (req: AuthedRequest) => {
  if (req.user.role !== "ADMIN") return forbiddenResponse("Admin only");
  try {
    const { searchParams } = req.nextUrl;
    const { page, limit } = parsePagination(searchParams);

    const { entries, total } = await getSpinWheelCoupons(page, limit);

    return successResponse(entries, undefined, 200, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("[admin/spin-wheel] GET error", err);
    return serverErrorResponse();
  }
};

export const GET = withStaffAuth(withPermission("manage:promotions")(getHandler));
