import { connectDB } from "@/lib/db/connect";
import { Branch } from "@/lib/db/models/Branch";
import { Member } from "@/lib/db/models/Member";
import { generateMemberId } from "@/lib/utils/generateMemberId";
import { writeAuditLog, type AuditActor } from "@/lib/services/audit.service";
import type { CreateMemberInput, UpdateMemberInput } from "@/lib/validations/member.schema";
import type { SessionUser } from "@/types";
import { caseInsensitiveRegex } from "@/lib/utils/escapeRegex";

function refIdToString(id: unknown): string | null {
  if (id == null) return null;
  if (typeof id === "object" && id !== null && "toString" in id) {
    return (id as { toString(): string }).toString();
  }
  return String(id);
}

/** Whether the authenticated user may read or mutate this member row. */
export function canUserAccessMember(
  member: { branchId?: unknown; organizationId?: unknown },
  user: SessionUser
): boolean {
  if (user.role === "ADMIN") return true;
  if (user.role === "ORG_ADMIN") {
    const org = user.organizationId;
    if (!org) return false;
    return refIdToString(member.organizationId) === org;
  }
  const bid = refIdToString(member.branchId);
  if (!bid) return false;
  return (user.branchIds ?? []).includes(bid);
}

/** Ensures the target branch exists and is assignable for a new member for this user. */
export async function assertBranchAssignableForMemberCreate(branchId: string, user: SessionUser): Promise<void> {
  await connectDB();
  const branch = await Branch.findOne({ _id: branchId, deletedAt: null }).select("organizationId").lean();
  if (!branch) throw new Error("Branch not found");
  if (user.role === "ADMIN") return;
  if (user.role === "ORG_ADMIN") {
    const org = user.organizationId;
    if (!org || refIdToString(branch.organizationId) !== org) {
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
  await connectDB();

  const baseFilter: Record<string, unknown> = { deletedAt: null };
  if (organizationId) {
    baseFilter.organizationId = organizationId;
  } else if (branchId) {
    baseFilter.branchId = branchId;
  }

  const query: Record<string, unknown> = { ...baseFilter };
  if (status) query.status = status;
  if (search) {
    const rx = caseInsensitiveRegex(search);
    query.$or = [{ name: rx }, { phone: rx }, { memberId: rx }, { email: rx }];
  }

  const skip = (page - 1) * limit;
  const [members, countsResult] = await Promise.all([
    Member.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Member.aggregate([
      {
        $facet: {
          total: [{ $match: query }, { $count: "n" }],
          active: [{ $match: { ...(baseFilter as Record<string, unknown>), status: "active" } }, { $count: "n" }],
          inactive: [{ $match: { ...(baseFilter as Record<string, unknown>), status: { $in: ["inactive", "suspended"] } } }, { $count: "n" }],
        },
      },
    ]),
  ]);

  const counts = countsResult[0] ?? {};
  const total = counts.total?.[0]?.n ?? 0;
  const activeCount = counts.active?.[0]?.n ?? 0;
  const inactiveCount = counts.inactive?.[0]?.n ?? 0;

  return { members, total, pages: Math.ceil(total / limit), activeCount, inactiveCount };
}

export async function getMemberById(memberId: string) {
  await connectDB();
  return Member.findOne({ _id: memberId, deletedAt: null }).lean();
}

export async function createMember(data: CreateMemberInput, actor?: AuditActor) {
  await connectDB();

  const existing = await Member.findOne({ phone: data.phone, deletedAt: null });
  if (existing) throw new Error("A member with this phone number already exists");

  const count = await Member.countDocuments();
  const memberId = generateMemberId(count + 1);

  const member = await Member.create({ ...data, memberId });

  if (actor) {
    void writeAuditLog({
      action: "member.created",
      actor,
      targetId: String(member._id),
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
  await connectDB();
  const existing = await Member.findOne({ _id: memberId, deletedAt: null }).lean();
  if (!existing || !canUserAccessMember(existing, user)) return null;
  const result = await Member.findOneAndUpdate(
    { _id: memberId, deletedAt: null },
    { $set: data },
    { new: true, runValidators: true }
  ).lean();

  if (result && actor) {
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
  await connectDB();
  const existing = await Member.findOne({ _id: memberId, deletedAt: null }).lean();
  if (!existing || !canUserAccessMember(existing, user)) return null;
  const result = await Member.findOneAndUpdate(
    { _id: memberId },
    { $set: { deletedAt: new Date(), status: "inactive" } },
    { new: true }
  ).lean();

  if (result && actor) {
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
