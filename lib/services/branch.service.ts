import { connectDB } from "@/lib/db/connect";
import { Branch } from "@/lib/db/models/Branch";
import { User } from "@/lib/db/models/User";
import { writeAuditLog, type AuditActor } from "@/lib/services/audit.service";
import type { Types } from "mongoose";

export async function getBranches(page = 1, limit = 20, organizationId?: string) {
  await connectDB();
  const skip = (page - 1) * limit;
  const filter: Record<string, unknown> = { deletedAt: null };
  if (organizationId) filter.organizationId = organizationId;

  const [branches, total] = await Promise.all([
    Branch.find(filter)
      .sort({ isHeadOffice: -1, name: 1 })
      .skip(skip)
      .limit(limit)
      .populate("managerId", "name email")
      .lean(),
    Branch.countDocuments(filter),
  ]);
  return { branches, total, pages: Math.ceil(total / limit) };
}

export async function getBranchById(branchId: string) {
  await connectDB();
  return Branch.findOne({ _id: branchId, deletedAt: null })
    .populate("managerId", "name email")
    .lean();
}

/** Head office branch for public storefront contact pages. */
export async function getHeadOfficeBranchPublic() {
  await connectDB();
  return Branch.findOne({ isHeadOffice: true, deletedAt: null, isActive: true })
    .select("name address phone email")
    .lean();
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

export async function createBranch(data: CreateBranchData) {
  await connectDB();
  const existing = await Branch.findOne({ code: data.code.toUpperCase() });
  if (existing) throw new Error(`Branch code "${data.code}" already exists`);

  return Branch.create({ ...data });
}

export async function updateBranch(branchId: string, data: UpdateBranchData, actor?: AuditActor) {
  await connectDB();
  const result = await Branch.findOneAndUpdate(
    { _id: branchId, deletedAt: null },
    { $set: data },
    { new: true, runValidators: true }
  ).lean();

  if (result && actor) {
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
  await connectDB();
  const branch = await Branch.findOne({ _id: branchId });
  if (branch?.isHeadOffice) throw new Error("Cannot delete the head office branch");
  const result = await Branch.findOneAndUpdate(
    { _id: branchId },
    { $set: { deletedAt: new Date(), isActive: false } },
    { new: true }
  ).lean();

  if (result && actor) {
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
  await connectDB();
  return User.find({ branchIds: branchId, deletedAt: null })
    .select("-password")
    .lean();
}

export async function assignUserToBranch(userId: string, branchId: string) {
  await connectDB();
  const user = await User.findOne({ _id: userId });
  if (!user) throw new Error("User not found");

  await User.updateOne({ _id: userId }, { $addToSet: { branchIds: branchId } });
}

export async function removeUserFromBranch(userId: string, branchId: string) {
  await connectDB();
  await User.updateOne(
    { _id: userId },
    { $pull: { branchIds: branchId as unknown as Types.ObjectId } }
  );
}
