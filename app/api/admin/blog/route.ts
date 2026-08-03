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
import { getAdminBlogPosts, createBlogPost } from "@/lib/services/blog.service";
import { parsePagination } from "@/lib/utils/pagination";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const getHandler = async (req: AuthedRequest) => {
  if (req.user.role !== "ADMIN") return forbiddenResponse("Admin only");
  try {
    const { searchParams } = req.nextUrl;
    const { page, limit } = parsePagination(searchParams);
    const isPublishedParam = searchParams.get("isPublished");
    const search = searchParams.get("search")?.trim();

    const { posts, total, pages } = await getAdminBlogPosts(
      { isPublished: isPublishedParam !== null ? isPublishedParam === "true" : undefined, search },
      page,
      limit
    );

    return successResponse(posts, undefined, 200, {
      page,
      limit,
      total,
      totalPages: pages,
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

    const post = await createBlogPost(parsed.data);

    void writeAuditLog({
      action: "blog_post.created",
      actor: { id: req.user.id, name: req.user.name },
      targetId: post.id,
      targetType: "BlogPost",
      metadata: { slug: post.slug },
    });

    return successResponse(post, "Post created", 201);
  } catch (err) {
    if (err instanceof Error && err.message === "A post with this slug already exists") {
      return errorResponse(err.message, 409);
    }
    console.error("[admin/blog] POST error", err);
    return serverErrorResponse();
  }
};

export const GET = withStaffAuth(withPermission("manage:blog")(getHandler));
export const POST = withStaffAuth(withPermission("manage:blog")(postHandler));
