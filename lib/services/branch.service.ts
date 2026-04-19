import { connectDB } from "@/lib/db/connect";
import { Branch, type IBranch } from "@/lib/db/models/Branch";
import { User } from "@/lib/db/models/User";
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

export interface CreateBranchData {
  name: string;
  code: string;
  address: string;
  phone?: string;
  email?: string;
  isHeadOffice?: boolean;
  organizationId?: string | null;
}

export interface UpdateBranchData extends Partial<CreateBranchData> {}

export async function createBranch(data: CreateBranchData) {
  await connectDB();
  const existing = await Branch.findOne({ code: data.code.toUpperCase() });
  if (existing) throw new Error(`Branch code "${data.code}" already exists`);

  return Branch.create({ ...data });
}

export async function updateBranch(branchId: string, data: UpdateBranchData) {
  await connectDB();
  return Branch.findOneAndUpdate(
    { _id: branchId, deletedAt: null },
    { $set: data },
    { new: true, runValidators: true }
  ).lean();
}

export async function deleteBranch(branchId: string) {
  await connectDB();
  const branch = await Branch.findOne({ _id: branchId });
  if (branch?.isHeadOffice) throw new Error("Cannot delete the head office branch");
  return Branch.findOneAndUpdate(
    { _id: branchId },
    { $set: { deletedAt: new Date(), isActive: false } },
    { new: true }
  ).lean();
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
