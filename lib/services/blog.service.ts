import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { CreateBlogPostInput, UpdateBlogPostInput } from "@/lib/validations/blogPost.schema";

export async function getAdminBlogPosts(
  filter: { isPublished?: boolean; search?: string },
  page: number,
  limit: number
) {
  const where: Prisma.BlogPostWhereInput = { deletedAt: null };
  if (filter.isPublished !== undefined) where.isPublished = filter.isPublished;
  if (filter.search) where.title = { contains: filter.search, mode: "insensitive" };

  const skip = (page - 1) * limit;
  const [posts, total] = await Promise.all([
    prisma.blogPost.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: limit }),
    prisma.blogPost.count({ where }),
  ]);

  return { posts, total, pages: Math.ceil(total / limit) };
}

export async function getAdminBlogPostById(id: string) {
  return prisma.blogPost.findFirst({ where: { id, deletedAt: null } });
}

export async function createBlogPost(data: CreateBlogPostInput) {
  const existing = await prisma.blogPost.findFirst({ where: { slug: data.slug, deletedAt: null } });
  if (existing) throw new Error("A post with this slug already exists");

  const publishedAt = data.isPublished && !data.publishedAt ? new Date() : data.publishedAt;
  return prisma.blogPost.create({ data: { ...data, publishedAt } });
}

export async function updateBlogPost(id: string, data: UpdateBlogPostInput) {
  if (data.slug) {
    const existing = await prisma.blogPost.findFirst({
      where: { slug: data.slug, deletedAt: null, id: { not: id } },
    });
    if (existing) throw new Error("A post with this slug already exists");
  }

  const current = await prisma.blogPost.findFirst({ where: { id, deletedAt: null } });
  if (!current) return null;

  const publishedAt = data.isPublished && !data.publishedAt && !current.publishedAt ? new Date() : data.publishedAt;

  return prisma.blogPost.update({ where: { id }, data: { ...data, publishedAt } });
}

export async function deleteBlogPost(id: string) {
  const existing = await prisma.blogPost.findFirst({ where: { id, deletedAt: null } });
  if (!existing) return null;

  return prisma.blogPost.update({ where: { id }, data: { deletedAt: new Date() } });
}
