import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db/connect";
import { User } from "@/lib/db/models/User";
import { DEFAULT_ROLE_PERMISSIONS } from "@/lib/db/models/Role";
import type { CreateUserInput, UpdateUserInput } from "@/lib/validations/user.schema";

export async function getUsers(
  tenantId: string,
  search?: string,
  role?: string,
  page = 1,
  limit = 20
) {
  await connectDB();
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = { tenantId, deletedAt: null };
  if (role) filter.role = role;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  return { users, total, pages: Math.ceil(total / limit) };
}

export async function getUserById(tenantId: string, userId: string) {
  await connectDB();
  return User.findOne({ _id: userId, tenantId, deletedAt: null })
    .select("-password")
    .lean();
}

export async function createUser(tenantId: string, data: CreateUserInput) {
  await connectDB();

  const existing = await User.findOne({ email: data.email.toLowerCase() });
  if (existing) throw new Error("Email is already registered");

  const hashedPassword = await bcrypt.hash(data.password, 12);
  const permissions = DEFAULT_ROLE_PERMISSIONS[data.role] ?? [];

  const user = await User.create({
    tenantId,
    name: data.name,
    email: data.email.toLowerCase(),
    password: hashedPassword,
    role: data.role,
    permissions,
    branchIds: data.branchIds,
    phone: data.phone,
    isActive: true,
  });

  const { password: _pw, ...safeUser } = user.toObject();
  return safeUser;
}

export async function updateUser(
  tenantId: string,
  userId: string,
  data: UpdateUserInput
) {
  await connectDB();

  const existing = await User.findOne({ _id: userId, tenantId, deletedAt: null });
  if (!existing) throw new Error("User not found");
  if (existing.role === "TENANT_OWNER") throw new Error("The tenant owner account cannot be modified");

  const update: Record<string, unknown> = { ...data };

  // Re-sync permissions when role changes
  if (data.role) {
    update.permissions = DEFAULT_ROLE_PERMISSIONS[data.role] ?? [];
  }

  const user = await User.findOneAndUpdate(
    { _id: userId, tenantId, deletedAt: null },
    { $set: update },
    { new: true, runValidators: true }
  )
    .select("-password")
    .lean();

  if (!user) throw new Error("User not found");
  return user;
}

export async function deleteUser(tenantId: string, userId: string, requesterId: string) {
  await connectDB();

  if (userId === requesterId) throw new Error("You cannot delete your own account");

  const user = await User.findOne({ _id: userId, tenantId, deletedAt: null });
  if (!user) throw new Error("User not found");
  if (user.role === "TENANT_OWNER") throw new Error("Cannot delete the tenant owner");

  return User.findOneAndUpdate(
    { _id: userId, tenantId },
    { $set: { deletedAt: new Date(), isActive: false } },
    { new: true }
  ).lean();
}
