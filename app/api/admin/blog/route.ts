import { connectDB } from "@/lib/db/connect";
import { BlogPost } from "@/lib/db/models/BlogPost";
import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import { withPermission } from "@/lib/middleware/withPermission";
import { createBlogPostSchema } from "@/lib/validations/blogPost.schema";
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
    const isPublished = searchParams.get("isPublished");
    const search = searchParams.get("search")?.trim();

    await connectDB();

    const filter: Record<string, unknown> = { deletedAt: null };
    if (isPublished !== null) filter.isPublished = isPublished === "true";
    if (search) filter.title = { $regex: search, $options: "i" };

    const skip = (page - 1) * limit;
    const [posts, total] = await Promise.all([
      BlogPost.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      BlogPost.countDocuments(filter),
    ]);

    return successResponse(posts, undefined, 200, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("[admin/blog] GET error", err);
    return serverErrorResponse();
  }
};

const postHandler = async (req: AuthedRequest) => {
  if (req.user.role !== "ADMIN") return forbiddenResponse("Admin only");
  try {
    const body = await req.json();
    const parsed = createBlogPostSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues.map((i) => i.message).join(", "), 400);
    }

    await connectDB();

    const existing = await BlogPost.findOne({ slug: parsed.data.slug, deletedAt: null })
      .select("_id")
      .lean();
    if (existing) return errorResponse("A post with this slug already exists", 409);

    const data = { ...parsed.data };
    if (data.isPublished && !data.publishedAt) data.publishedAt = new Date();

    const post = await BlogPost.create(data);

    void writeAuditLog({
      action: "blog_post.created",
      actor: { id: req.user.id, name: req.user.name },
      targetId: String(post._id),
      targetType: "BlogPost",
      metadata: { slug: post.slug },
    });

    return successResponse(post, "Post created", 201);
  } catch (err) {
    console.error("[admin/blog] POST error", err);
    return serverErrorResponse();
  }
};

export const GET = withStaffAuth(withPermission("manage:blog")(getHandler));
export const POST = withStaffAuth(withPermission("manage:blog")(postHandler));
