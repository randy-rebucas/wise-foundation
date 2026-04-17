import { connectDB } from "@/lib/db/connect";
import { Branch, type IBranch } from "@/lib/db/models/Branch";
import { User } from "@/lib/db/models/User";
import type { Types } from "mongoose";

export async function getBranches(tenantId: string, page = 1, limit = 20) {
  await connectDB();
  const skip = (page - 1) * limit;
  const [branches, total] = await Promise.all([
    Branch.find({ tenantId, deletedAt: null })
      .sort({ isHeadOffice: -1, name: 1 })
      .skip(skip)
      .limit(limit)
      .populate("managerId", "name email")
      .lean(),
    Branch.countDocuments({ tenantId, deletedAt: null }),
  ]);
  return { branches, total, pages: Math.ceil(total / limit) };
}

export async function getBranchById(tenantId: string, branchId: string) {
  await connectDB();
  return Branch.findOne({ _id: branchId, tenantId, deletedAt: null })
    .populate("managerId", "name email")
    .lean();
}

export async function createBranch(
  tenantId: string,
  data: Pick<IBranch, "name" | "code" | "address" | "phone" | "email" | "isHeadOffice">
) {
  await connectDB();
  const existing = await Branch.findOne({ tenantId, code: data.code.toUpperCase() });
  if (existing) throw new Error(`Branch code "${data.code}" already exists`);

  return Branch.create({ ...data, tenantId });
}

export async function updateBranch(
  tenantId: string,
  branchId: string,
  data: Partial<IBranch>
) {
  await connectDB();
  return Branch.findOneAndUpdate(
    { _id: branchId, tenantId, deletedAt: null },
    { $set: data },
    { new: true, runValidators: true }
  ).lean();
}

export async function deleteBranch(tenantId: string, branchId: string) {
  await connectDB();
  const branch = await Branch.findOne({ _id: branchId, tenantId });
  if (branch?.isHeadOffice) throw new Error("Cannot delete the head office branch");
  return Branch.findOneAndUpdate(
    { _id: branchId, tenantId },
    { $set: { deletedAt: new Date(), isActive: false } },
    { new: true }
  ).lean();
}

export async function getBranchUsers(tenantId: string, branchId: string) {
  await connectDB();
  return User.find({ tenantId, branchIds: branchId, deletedAt: null })
    .select("-password")
    .lean();
}

export async function assignUserToBranch(
  tenantId: string,
  userId: string,
  branchId: string
) {
  await connectDB();
  const user = await User.findOne({ _id: userId, tenantId });
  if (!user) throw new Error("User not found");

  await User.updateOne(
    { _id: userId, tenantId },
    { $addToSet: { branchIds: branchId } }
  );
}

export async function removeUserFromBranch(
  tenantId: string,
  userId: string,
  branchId: string
) {
  await connectDB();
  await User.updateOne(
    { _id: userId, tenantId },
    { $pull: { branchIds: branchId as unknown as Types.ObjectId } }
  );
}
