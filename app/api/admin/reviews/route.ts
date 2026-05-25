import { connectDB } from "@/lib/db/connect";
import { User } from "@/lib/db/models/User";
import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import { withPermission } from "@/lib/middleware/withPermission";
import { successResponse, serverErrorResponse } from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

export type AdminReview = {
  id: string;
  reviewerName: string;
  reviewerEmail: string;
  productId: string;
  productName: string;
  productSlug?: string;
  rating: number;
  text: string;
  createdAt: string;
};

const handler = async (req: AuthedRequest) => {
  try {
    const { searchParams } = req.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
    const minRating = parseInt(searchParams.get("minRating") ?? "1", 10);
    const maxRating = parseInt(searchParams.get("maxRating") ?? "5", 10);
    const productId = searchParams.get("productId") ?? "";
    const search = searchParams.get("search")?.trim() ?? "";

    await connectDB();

    const customers = await User.find({
      role: "CUSTOMER",
      deletedAt: null,
      "marketplace.reviews.0": { $exists: true },
    })
      .select("name email marketplace.reviews")
      .lean();

    const all: AdminReview[] = [];
    for (const user of customers) {
      for (const r of user.marketplace?.reviews ?? []) {
        all.push({
          id: r.id,
          reviewerName: user.name,
          reviewerEmail: user.email,
          productId: r.productId,
          productName: r.productName,
          productSlug: r.productSlug,
          rating: r.rating,
          text: r.text,
          createdAt: r.createdAt,
        });
      }
    }

    all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Stats over all reviews (before filters)
    const totalAll = all.length;
    const avgAll = totalAll > 0 ? all.reduce((s, r) => s + r.rating, 0) / totalAll : null;
    const ratingCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const r of all) ratingCounts[r.rating] = (ratingCounts[r.rating] ?? 0) + 1;

    // Apply filters
    let filtered = all.filter((r) => r.rating >= minRating && r.rating <= maxRating);
    if (productId) filtered = filtered.filter((r) => r.productId === productId);
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.productName.toLowerCase().includes(q) ||
          r.reviewerName.toLowerCase().includes(q) ||
          r.text.toLowerCase().includes(q)
      );
    }

    const total = filtered.length;
    const data = filtered.slice((page - 1) * limit, page * limit);

    return successResponse(data, undefined, 200, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      stats: {
        totalAll,
        averageRating: avgAll !== null ? Math.round(avgAll * 10) / 10 : null,
        ratingCounts,
        negativeCount: (ratingCounts[1] ?? 0) + (ratingCounts[2] ?? 0) + (ratingCounts[3] ?? 0),
      },
    });
  } catch (err) {
    console.error("[admin/reviews] GET error", err);
    return serverErrorResponse();
  }
};

export const GET = withStaffAuth(withPermission("manage:users")(handler));
