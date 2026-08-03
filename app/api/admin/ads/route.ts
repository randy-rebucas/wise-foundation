import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import { withPermission } from "@/lib/middleware/withPermission";
import { createAdSchema } from "@/lib/validations/ad.schema";
import {
  successResponse,
  errorResponse,
  forbiddenResponse,
  serverErrorResponse,
} from "@/lib/utils/apiResponse";
import { writeAuditLog } from "@/lib/services/audit.service";
import { getAds, createAd } from "@/lib/services/ad.service";
import { parsePagination } from "@/lib/utils/pagination";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const getHandler = async (req: AuthedRequest) => {
  if (req.user.role !== "ADMIN") return forbiddenResponse("Admin only");
  try {
    const { searchParams } = req.nextUrl;
    const { page, limit } = parsePagination(searchParams);
    const isActiveParam = searchParams.get("isActive");
    const search = searchParams.get("search")?.trim();

    const { ads, total, pages } = await getAds(
      { isActive: isActiveParam !== null ? isActiveParam === "true" : undefined, search },
      page,
      limit
    );

    return successResponse(ads, undefined, 200, {
      page,
      limit,
      total,
      totalPages: pages,
    });
  } catch (err) {
    console.error("[admin/ads] GET error", err);
    return serverErrorResponse();
  }
};

const postHandler = async (req: AuthedRequest) => {
  if (req.user.role !== "ADMIN") return forbiddenResponse("Admin only");
  try {
    const body = await req.json();
    const parsed = createAdSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues.map((i) => i.message).join(", "), 400);
    }

    const ad = await createAd(parsed.data);

    void writeAuditLog({
      action: "ad.created",
      actor: { id: req.user.id, name: req.user.name },
      targetId: ad.id,
      targetType: "Ad",
      metadata: { productId: parsed.data.productId },
    });

    return successResponse(ad, "Ad created", 201);
  } catch (err) {
    if (err instanceof Error && err.message === "Product not found") {
      return errorResponse("Product not found", 404);
    }
    console.error("[admin/ads] POST error", err);
    return serverErrorResponse();
  }
};

export const GET = withStaffAuth(withPermission("manage:ads")(getHandler));
export const POST = withStaffAuth(withPermission("manage:ads")(postHandler));
