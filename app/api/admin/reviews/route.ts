import { connectDB } from "@/lib/db/connect";
import { User } from "@/lib/db/models/User";
import { Product } from "@/lib/db/models/Product";
import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import { withPermission } from "@/lib/middleware/withPermission";
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";
import mongoose from "mongoose";

export type AdminReview = {
  id: string;
  userId: string;
  reviewerName: string;
  reviewerEmail: string;
  productId: string;
  productName: string;
  productSlug?: string;
  rating: number;
  text: string;
  createdAt: string;
  images: string[];
  featured: boolean;
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

    // Filter match applied on raw doc fields (before $project)
    const preProjectMatch: Record<string, unknown> = {
      "marketplace.reviews.rating": { $gte: minRating, $lte: maxRating },
    };
    if (productId) preProjectMatch["marketplace.reviews.productId"] = productId;
    if (search) {
      preProjectMatch.$or = [
        { "marketplace.reviews.productName": { $regex: search, $options: "i" } },
        { name: { $regex: search, $options: "i" } },
        { "marketplace.reviews.text": { $regex: search, $options: "i" } },
      ];
    }

    const [statsResult, pageResult] = await Promise.all([
      // Stats pipeline — all reviews, no user filters
      User.aggregate([
        { $match: { deletedAt: null, "marketplace.reviews.0": { $exists: true } } },
        { $unwind: "$marketplace.reviews" },
        {
          $group: {
            _id: null,
            totalAll: { $sum: 1 },
            sumRating: { $sum: "$marketplace.reviews.rating" },
            r1: { $sum: { $cond: [{ $eq: ["$marketplace.reviews.rating", 1] }, 1, 0] } },
            r2: { $sum: { $cond: [{ $eq: ["$marketplace.reviews.rating", 2] }, 1, 0] } },
            r3: { $sum: { $cond: [{ $eq: ["$marketplace.reviews.rating", 3] }, 1, 0] } },
            r4: { $sum: { $cond: [{ $eq: ["$marketplace.reviews.rating", 4] }, 1, 0] } },
            r5: { $sum: { $cond: [{ $eq: ["$marketplace.reviews.rating", 5] }, 1, 0] } },
          },
        },
      ]),
      // Filtered + paginated pipeline
      User.aggregate([
        { $match: { deletedAt: null, "marketplace.reviews.0": { $exists: true } } },
        { $unwind: "$marketplace.reviews" },
        { $match: preProjectMatch },
        { $sort: { "marketplace.reviews.createdAt": -1 } },
        {
          $facet: {
            data: [
              { $skip: (page - 1) * limit },
              { $limit: limit },
              {
                $project: {
                  _id: 0,
                  id: "$marketplace.reviews.id",
                  userId: { $toString: "$_id" },
                  reviewerName: "$name",
                  reviewerEmail: "$email",
                  productId: "$marketplace.reviews.productId",
                  productName: "$marketplace.reviews.productName",
                  productSlug: "$marketplace.reviews.productSlug",
                  rating: "$marketplace.reviews.rating",
                  text: "$marketplace.reviews.text",
                  createdAt: "$marketplace.reviews.createdAt",
                  images: { $ifNull: ["$marketplace.reviews.images", []] },
                  featured: { $ifNull: ["$marketplace.reviews.featured", false] },
                },
              },
            ],
            totalCount: [{ $count: "count" }],
          },
        },
      ]),
    ]);

    const stats = statsResult[0] ?? { totalAll: 0, sumRating: 0, r1: 0, r2: 0, r3: 0, r4: 0, r5: 0 };
    const ratingCounts = { 1: stats.r1, 2: stats.r2, 3: stats.r3, 4: stats.r4, 5: stats.r5 };
    const avgAll = stats.totalAll > 0 ? stats.sumRating / stats.totalAll : null;

    const facet = pageResult[0] ?? { data: [], totalCount: [] };
    const total: number = facet.totalCount[0]?.count ?? 0;
    const data = facet.data as AdminReview[];

    return successResponse(data, undefined, 200, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      stats: {
        totalAll: stats.totalAll,
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

// POST /api/admin/reviews — manually create a review
const createHandler = async (req: AuthedRequest) => {
  try {
    const body = await req.json();
    const { reviewerName, reviewerEmail, productId, rating, text, featured, images } = body as {
      reviewerName: string;
      reviewerEmail: string;
      productId: string;
      rating: number;
      text: string;
      featured?: boolean;
      images?: string[];
    };

    if (!reviewerName?.trim()) return errorResponse("Reviewer name is required", 400);
    if (!reviewerEmail?.trim()) return errorResponse("Reviewer email is required", 400);
    if (!productId?.trim()) return errorResponse("Product is required", 400);
    if (!rating || rating < 1 || rating > 5) return errorResponse("Rating must be 1–5", 400);
    if (!text?.trim()) return errorResponse("Review text is required", 400);

    await connectDB();

    const product = await Product.findById(productId).select("name slug").lean();
    if (!product) return errorResponse("Product not found", 404);

    const reviewEntry = {
      id: new mongoose.Types.ObjectId().toString().slice(-12),
      productId,
      productName: product.name as string,
      productSlug: product.slug as string | undefined,
      rating,
      text: text.trim(),
      createdAt: new Date().toISOString(),
      images: Array.isArray(images) ? images.filter(Boolean) : [],
      featured: featured ?? false,
    };

    // Attach to existing customer or create a generated one
    const existing = await User.findOne({
      email: reviewerEmail.trim().toLowerCase(),
      deletedAt: null,
    }).select("_id").lean();

    if (existing) {
      await User.updateOne(
        { _id: existing._id },
        { $push: { "marketplace.reviews": reviewEntry } }
      );
    } else {
      await User.collection.insertOne({
        name: reviewerName.trim(),
        email: reviewerEmail.trim().toLowerCase(),
        role: "CUSTOMER",
        isActive: true,
        emailVerified: true,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        marketplace: { wishlist: [], savedAddresses: [], paymentMethods: [], reviews: [reviewEntry] },
      });
    }

    return successResponse({ ok: true });
  } catch (err) {
    console.error("[admin/reviews] POST error", err);
    return serverErrorResponse();
  }
};

export const POST = withStaffAuth(withPermission("manage:users")(createHandler));
