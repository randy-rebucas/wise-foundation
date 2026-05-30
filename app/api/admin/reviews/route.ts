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

    const customers = await User.find({
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
          userId: String((user as { _id: unknown })._id),
          reviewerName: user.name,
          reviewerEmail: user.email,
          productId: r.productId,
          productName: r.productName,
          productSlug: r.productSlug,
          rating: r.rating,
          text: r.text,
          createdAt: r.createdAt,
          images: r.images ?? [],
          featured: r.featured ?? false,
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
