import { connectDB } from "@/lib/db/connect";
import { Ad } from "@/lib/db/models/Ad";
import { Product } from "@/lib/db/models/Product";
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
import { parsePagination } from "@/lib/utils/pagination";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const getHandler = async (req: AuthedRequest) => {
  if (req.user.role !== "ADMIN") return forbiddenResponse("Admin only");
  try {
    const { searchParams } = req.nextUrl;
    const { page, limit } = parsePagination(searchParams);
    const isActive = searchParams.get("isActive");
    const search = searchParams.get("search")?.trim();

    await connectDB();

    const filter: Record<string, unknown> = { deletedAt: null };
    if (isActive !== null) filter.isActive = isActive === "true";
    if (search) filter.headline = { $regex: search, $options: "i" };

    const skip = (page - 1) * limit;
    const [ads, total] = await Promise.all([
      Ad.find(filter)
        .sort({ sortOrder: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("productId", "name slug images")
        .lean(),
      Ad.countDocuments(filter),
    ]);

    return successResponse(ads, undefined, 200, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
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

    await connectDB();

    const product = await Product.findById(parsed.data.productId).select("_id").lean();
    if (!product) return errorResponse("Product not found", 404);

    const ad = await Ad.create(parsed.data);

    void writeAuditLog({
      action: "ad.created",
      actor: { id: req.user.id, name: req.user.name },
      targetId: String(ad._id),
      targetType: "Ad",
      metadata: { productId: parsed.data.productId },
    });

    return successResponse(ad, "Ad created", 201);
  } catch (err) {
    console.error("[admin/ads] POST error", err);
    return serverErrorResponse();
  }
};

export const GET = withStaffAuth(withPermission("manage:ads")(getHandler));
export const POST = withStaffAuth(withPermission("manage:ads")(postHandler));
