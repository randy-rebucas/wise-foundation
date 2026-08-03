import { prisma } from "@/lib/db/prisma";
import { writeAuditLog, type AuditActor } from "@/lib/services/audit.service";

export async function getBranches(page = 1, limit = 20, organizationId?: string) {
  const skip = (page - 1) * limit;
  const where: Record<string, unknown> = { deletedAt: null };
  if (organizationId) where.organizationId = organizationId;

  const [branches, total] = await Promise.all([
    prisma.branch.findMany({
      where,
      orderBy: [{ isHeadOffice: "desc" }, { name: "asc" }],
      skip,
      take: limit,
      include: { manager: { select: { name: true, email: true } } },
    }),
    prisma.branch.count({ where }),
  ]);
  return { branches, total, pages: Math.ceil(total / limit) };
}

export async function getBranchById(branchId: string) {
  return prisma.branch.findFirst({
    where: { id: branchId, deletedAt: null },
    include: { manager: { select: { name: true, email: true } } },
  });
}

/** Head office branch for public storefront contact pages. */
export async function getHeadOfficeBranchPublic() {
  return prisma.branch.findFirst({
    where: { isHeadOffice: true, deletedAt: null, isActive: true },
    select: { name: true, address: true, phone: true, email: true },
  });
}

export interface CreateBranchData {
  name: string;
  code: string;
  address: string;
  phone?: string;
  email?: string;
  isHeadOffice?: boolean;
  organizationId?: string | null;
}

export type UpdateBranchData = Partial<CreateBranchData>;

export async function createBranch(data: CreateBranchData, actor?: AuditActor) {
  const code = data.code.toUpperCase();
  const existing = await prisma.branch.findUnique({ where: { code } });
  if (existing) throw new Error(`Branch code "${data.code}" already exists`);

  const branch = await prisma.branch.create({ data: { ...data, code } });

  if (actor) {
    void writeAuditLog({
      action: "branch.created",
      actor,
      targetId: branch.id,
      targetType: "Branch",
      metadata: { name: data.name, code: data.code },
    });
  }

  return branch;
}

export async function updateBranch(branchId: string, data: UpdateBranchData, actor?: AuditActor) {
  const existing = await prisma.branch.findFirst({ where: { id: branchId, deletedAt: null } });
  if (!existing) return null;

  const result = await prisma.branch.update({ where: { id: branchId }, data });

  if (actor) {
    void writeAuditLog({
      action: "branch.updated",
      actor,
      targetId: branchId,
      targetType: "Branch",
      metadata: { fields: Object.keys(data) },
    });
  }

  return result;
}

export async function deleteBranch(branchId: string, actor?: AuditActor) {
  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  if (branch?.isHeadOffice) throw new Error("Cannot delete the head office branch");

  const result = await prisma.branch.update({
    where: { id: branchId },
    data: { deletedAt: new Date(), isActive: false },
  });

  if (actor) {
    void writeAuditLog({
      action: "branch.deleted",
      actor,
      targetId: branchId,
      targetType: "Branch",
      metadata: { name: branch?.name },
    });
  }

  return result;
}

export async function getBranchUsers(branchId: string) {
  return prisma.user.findMany({
    where: { deletedAt: null, branches: { some: { branchId } } },
    omit: { password: true },
  });
}

export async function assignUserToBranch(userId: string, branchId: string, actor?: AuditActor) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  await prisma.userBranch.upsert({
    where: { userId_branchId: { userId, branchId } },
    create: { userId, branchId },
    update: {},
  });

  if (actor) {
    void writeAuditLog({
      action: "branch.user_assigned",
      actor,
      targetId: branchId,
      targetType: "Branch",
      metadata: { userId, userName: user.name },
    });
  }
}

export async function removeUserFromBranch(userId: string, branchId: string, actor?: AuditActor) {
  await prisma.userBranch.deleteMany({ where: { userId, branchId } });

  if (actor) {
    void writeAuditLog({
      action: "branch.user_removed",
      actor,
      targetId: branchId,
      targetType: "Branch",
      metadata: { userId },
    });
  }
}
