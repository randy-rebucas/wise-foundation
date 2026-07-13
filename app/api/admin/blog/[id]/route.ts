import { connectDB } from "@/lib/db/connect";
import { BlogPost } from "@/lib/db/models/BlogPost";
import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import { withPermission } from "@/lib/middleware/withPermission";
import { updateBlogPostSchema } from "@/lib/validations/blogPost.schema";
import {
  successResponse,
  errorResponse,
  forbiddenResponse,
  notFoundResponse,
  serverErrorResponse,
} from "@/lib/utils/apiResponse";
import { writeAuditLog } from "@/lib/services/audit.service";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const getHandler = async (req: AuthedRequest, ctx: unknown) => {
  if (req.user.role !== "ADMIN") return forbiddenResponse("Admin only");
  try {
    const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
    await connectDB();
    const post = await BlogPost.findOne({ _id: id, deletedAt: null }).lean();
    if (!post) return notFoundResponse("Post not found");
    return successResponse(post);
  } catch (err) {
    console.error("[admin/blog/:id] GET error", err);
    return serverErrorResponse();
  }
};

const patchHandler = async (req: AuthedRequest, ctx: unknown) => {
  if (req.user.role !== "ADMIN") return forbiddenResponse("Admin only");
  try {
    const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
    const body = await req.json();
    const parsed = updateBlogPostSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues.map((issue) => issue.message).join(", "), 400);
    }

    await connectDB();

    if (parsed.data.slug) {
      const existing = await BlogPost.findOne({
        slug: parsed.data.slug,
        deletedAt: null,
        _id: { $ne: id },
      })
        .select("_id")
        .lean();
      if (existing) return errorResponse("A post with this slug already exists", 409);
    }

    const data = { ...parsed.data };
    if (data.isPublished && !data.publishedAt) data.publishedAt = new Date();

    const post = await BlogPost.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { $set: data },
      { new: true }
    );
    if (!post) return notFoundResponse("Post not found");

    void writeAuditLog({
      action: "blog_post.updated",
      actor: { id: req.user.id, name: req.user.name },
      targetId: id,
      targetType: "BlogPost",
    });

    return successResponse(post, "Post updated");
  } catch (err) {
    console.error("[admin/blog/:id] PATCH error", err);
    return serverErrorResponse();
  }
};

const deleteHandler = async (req: AuthedRequest, ctx: unknown) => {
  if (req.user.role !== "ADMIN") return forbiddenResponse("Admin only");
  try {
    const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
    await connectDB();

    const post = await BlogPost.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { $set: { deletedAt: new Date() } },
      { new: true }
    );
    if (!post) return notFoundResponse("Post not found");

    void writeAuditLog({
      action: "blog_post.deleted",
      actor: { id: req.user.id, name: req.user.name },
      targetId: id,
      targetType: "BlogPost",
    });

    return successResponse(null, "Post deleted");
  } catch (err) {
    console.error("[admin/blog/:id] DELETE error", err);
    return serverErrorResponse();
  }
};

export const GET = withStaffAuth(withPermission("manage:blog")(getHandler));
export const PATCH = withStaffAuth(withPermission("manage:blog")(patchHandler));
export const DELETE = withStaffAuth(withPermission("manage:blog")(deleteHandler));
