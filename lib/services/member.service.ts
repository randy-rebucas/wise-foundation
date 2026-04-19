import { connectDB } from "@/lib/db/connect";
import { Member } from "@/lib/db/models/Member";
import { generateMemberId } from "@/lib/utils/generateMemberId";
import type { CreateMemberInput, UpdateMemberInput } from "@/lib/validations/member.schema";

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
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
      { memberId: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  const skip = (page - 1) * limit;
  const [members, total, activeCount, inactiveCount] = await Promise.all([
    Member.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Member.countDocuments(query),
    Member.countDocuments({ ...baseFilter, status: "active" }),
    Member.countDocuments({ ...baseFilter, status: { $in: ["inactive", "suspended"] } }),
  ]);

  return { members, total, pages: Math.ceil(total / limit), activeCount, inactiveCount };
}

export async function getMemberById(memberId: string) {
  await connectDB();
  return Member.findOne({ _id: memberId, deletedAt: null }).lean();
}

export async function createMember(data: CreateMemberInput) {
  await connectDB();

  const existing = await Member.findOne({ phone: data.phone, deletedAt: null });
  if (existing) throw new Error("A member with this phone number already exists");

  const count = await Member.countDocuments();
  const memberId = generateMemberId(count + 1);

  return Member.create({ ...data, memberId });
}

export async function updateMember(memberId: string, data: UpdateMemberInput) {
  await connectDB();
  return Member.findOneAndUpdate(
    { _id: memberId, deletedAt: null },
    { $set: data },
    { new: true, runValidators: true }
  ).lean();
}

export async function deleteMember(memberId: string) {
  await connectDB();
  return Member.findOneAndUpdate(
    { _id: memberId },
    { $set: { deletedAt: new Date(), status: "inactive" } },
    { new: true }
  ).lean();
}
