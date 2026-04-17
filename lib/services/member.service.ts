import { connectDB } from "@/lib/db/connect";
import { Member } from "@/lib/db/models/Member";
import { generateMemberId } from "@/lib/utils/generateMemberId";
import type { CreateMemberInput, UpdateMemberInput } from "@/lib/validations/member.schema";

export async function getMembers(
  tenantId: string,
  search?: string,
  status?: string,
  branchId?: string,
  page = 1,
  limit = 20
) {
  await connectDB();

  const query: Record<string, unknown> = { tenantId, deletedAt: null };
  if (status) query.status = status;
  if (branchId) query.branchId = branchId;
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
      { memberId: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  const skip = (page - 1) * limit;
  const [members, total] = await Promise.all([
    Member.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Member.countDocuments(query),
  ]);

  return { members, total, pages: Math.ceil(total / limit) };
}

export async function getMemberById(tenantId: string, memberId: string) {
  await connectDB();
  return Member.findOne({ _id: memberId, tenantId, deletedAt: null }).lean();
}

export async function createMember(tenantId: string, data: CreateMemberInput) {
  await connectDB();

  // Check for duplicate phone in tenant
  const existing = await Member.findOne({ tenantId, phone: data.phone, deletedAt: null });
  if (existing) throw new Error("A member with this phone number already exists");

  // Generate unique member ID
  const count = await Member.countDocuments({ tenantId });
  const memberId = generateMemberId(count + 1);

  return Member.create({ ...data, tenantId, memberId });
}

export async function updateMember(
  tenantId: string,
  memberId: string,
  data: UpdateMemberInput
) {
  await connectDB();
  return Member.findOneAndUpdate(
    { _id: memberId, tenantId, deletedAt: null },
    { $set: data },
    { new: true, runValidators: true }
  ).lean();
}

export async function deleteMember(tenantId: string, memberId: string) {
  await connectDB();
  return Member.findOneAndUpdate(
    { _id: memberId, tenantId },
    { $set: { deletedAt: new Date(), status: "inactive" } },
    { new: true }
  ).lean();
}
