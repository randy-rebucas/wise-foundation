import { prisma } from "@/lib/db/prisma";
import { generateMemberId } from "@/lib/utils/generateMemberId";
import { writeAuditLog, type AuditActor } from "@/lib/services/audit.service";
import type { CreateMemberInput, UpdateMemberInput } from "@/lib/validations/member.schema";
import type { SessionUser } from "@/types";

/** Whether the authenticated user may read or mutate this member row. */
export function canUserAccessMember(
  member: { branchId?: string | null; organizationId?: string | null },
  user: SessionUser
): boolean {
  if (user.role === "ADMIN") return true;
  if (user.role === "ORG_ADMIN") {
    const org = user.organizationId;
    if (!org) return false;
    return member.organizationId === org;
  }
  if (!member.branchId) return false;
  return (user.branchIds ?? []).includes(member.branchId);
}

/** Ensures the target branch exists and is assignable for a new member for this user. */
export async function assertBranchAssignableForMemberCreate(branchId: string, user: SessionUser): Promise<void> {
  const branch = await prisma.branch.findFirst({
    where: { id: branchId, deletedAt: null },
    select: { organizationId: true },
  });
  if (!branch) throw new Error("Branch not found");
  if (user.role === "ADMIN") return;
  if (user.role === "ORG_ADMIN") {
    const org = user.organizationId;
    if (!org || branch.organizationId !== org) {
      throw new Error("Branch is not in your organization");
    }
    return;
  }
  if (!user.branchIds?.includes(branchId)) {
    throw new Error("You can only register members for branches you are assigned to");
  }
}

export async function getMembers(
  search?: string,
  status?: string,
  branchId?: string,
  page = 1,
  limit = 20,
  organizationId?: string
) {
  const baseWhere: Record<string, unknown> = { deletedAt: null };
  if (organizationId) {
    baseWhere.organizationId = organizationId;
  } else if (branchId) {
    baseWhere.branchId = branchId;
  }

  const where: Record<string, unknown> = { ...baseWhere };
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
      { memberId: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  const skip = (page - 1) * limit;
  const [members, total, activeCount, inactiveCount] = await Promise.all([
    prisma.member.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: limit }),
    prisma.member.count({ where }),
    prisma.member.count({ where: { ...baseWhere, status: "active" } }),
    prisma.member.count({ where: { ...baseWhere, status: { in: ["inactive", "suspended"] } } }),
  ]);

  return { members, total, pages: Math.ceil(total / limit), activeCount, inactiveCount };
}

export async function getMemberById(memberId: string) {
  return prisma.member.findFirst({ where: { id: memberId, deletedAt: null } });
}

export async function createMember(data: CreateMemberInput, actor?: AuditActor) {
  const existing = await prisma.member.findFirst({ where: { phone: data.phone, deletedAt: null } });
  if (existing) throw new Error("A member with this phone number already exists");

  const count = await prisma.member.count();
  const memberId = generateMemberId(count + 1);

  const member = await prisma.member.create({ data: { ...data, memberId } });

  if (actor) {
    void writeAuditLog({
      action: "member.created",
      actor,
      targetId: member.id,
      targetType: "Member",
      metadata: { name: data.name, memberId },
    });
  }

  return member;
}

export async function updateMember(
  memberId: string,
  user: SessionUser,
  data: UpdateMemberInput,
  actor?: AuditActor
) {
  const existing = await prisma.member.findFirst({ where: { id: memberId, deletedAt: null } });
  if (!existing || !canUserAccessMember(existing, user)) return null;

  const result = await prisma.member.update({ where: { id: memberId }, data });

  if (actor) {
    void writeAuditLog({
      action: "member.status_changed",
      actor,
      targetId: memberId,
      targetType: "Member",
      metadata:
        "status" in data
          ? { fromStatus: existing.status, toStatus: data.status }
          : { fields: Object.keys(data) },
    });
  }

  return result;
}

export async function deleteMember(memberId: string, user: SessionUser, actor?: AuditActor) {
  const existing = await prisma.member.findFirst({ where: { id: memberId, deletedAt: null } });
  if (!existing || !canUserAccessMember(existing, user)) return null;

  const result = await prisma.member.update({
    where: { id: memberId },
    data: { deletedAt: new Date(), status: "inactive" },
  });

  if (actor) {
    void writeAuditLog({
      action: "member.deleted",
      actor,
      targetId: memberId,
      targetType: "Member",
      metadata: { name: existing.name },
    });
  }

  return result;
}
