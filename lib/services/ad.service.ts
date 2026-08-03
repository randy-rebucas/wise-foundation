import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { CreateAdInput, UpdateAdInput } from "@/lib/validations/ad.schema";

export async function getAds(filter: { isActive?: boolean; search?: string }, page: number, limit: number) {
  const where: Prisma.AdWhereInput = { deletedAt: null };
  if (filter.isActive !== undefined) where.isActive = filter.isActive;
  if (filter.search) where.headline = { contains: filter.search, mode: "insensitive" };

  const skip = (page - 1) * limit;
  const [ads, total] = await Promise.all([
    prisma.ad.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      skip,
      take: limit,
      include: { product: { select: { name: true, slug: true, images: true } } },
    }),
    prisma.ad.count({ where }),
  ]);

  return { ads, total, pages: Math.ceil(total / limit) };
}

export async function getAdById(id: string) {
  return prisma.ad.findFirst({
    where: { id, deletedAt: null },
    include: { product: { select: { name: true, slug: true, images: true } } },
  });
}

export async function createAd(data: CreateAdInput) {
  const product = await prisma.product.findUnique({ where: { id: data.productId } });
  if (!product) throw new Error("Product not found");
  return prisma.ad.create({ data });
}

export async function updateAd(id: string, data: UpdateAdInput) {
  if (data.productId) {
    const product = await prisma.product.findUnique({ where: { id: data.productId } });
    if (!product) throw new Error("Product not found");
  }

  const existing = await prisma.ad.findFirst({ where: { id, deletedAt: null } });
  if (!existing) return null;

  return prisma.ad.update({ where: { id }, data });
}

export async function deleteAd(id: string) {
  const existing = await prisma.ad.findFirst({ where: { id, deletedAt: null } });
  if (!existing) return null;

  return prisma.ad.update({ where: { id }, data: { deletedAt: new Date() } });
}
