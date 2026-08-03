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
import { getAdminBlogPostById, updateBlogPost, deleteBlogPost } from "@/lib/services/blog.service";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const getHandler = async (req: AuthedRequest, ctx: unknown) => {
  if (req.user.role !== "ADMIN") return forbiddenResponse("Admin only");
  try {
    const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
    const post = await getAdminBlogPostById(id);
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

    const post = await updateBlogPost(id, parsed.data);
    if (!post) return notFoundResponse("Post not found");

    void writeAuditLog({
      action: "blog_post.updated",
      actor: { id: req.user.id, name: req.user.name },
      targetId: id,
      targetType: "BlogPost",
    });

    return successResponse(post, "Post updated");
  } catch (err) {
    if (err instanceof Error && err.message === "A post with this slug already exists") {
      return errorResponse(err.message, 409);
    }
    console.error("[admin/blog/:id] PATCH error", err);
    return serverErrorResponse();
  }
};

const deleteHandler = async (req: AuthedRequest, ctx: unknown) => {
  if (req.user.role !== "ADMIN") return forbiddenResponse("Admin only");
  try {
    const { id } = await (ctx as { params: Promise<{ id: string }> }).params;

    const post = await deleteBlogPost(id);
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
