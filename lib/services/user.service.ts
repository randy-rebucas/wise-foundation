import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db/connect";
import { User } from "@/lib/db/models/User";
import { DEFAULT_ROLE_PERMISSIONS } from "@/lib/db/models/Role";
import type { CreateUserInput, UpdateUserInput } from "@/lib/validations/user.schema";

export async function getUsers(search?: string, role?: string, page = 1, limit = 20, organizationId?: string) {
  await connectDB();
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = { deletedAt: null };
  if (role) filter.role = role;
  if (organizationId) filter.organizationId = organizationId;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .select("-password")
      .populate("organizationId", "name type")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  return { users, total, pages: Math.ceil(total / limit) };
}

export async function getUserById(userId: string) {
  await connectDB();
  return User.findOne({ _id: userId, deletedAt: null })
    .select("-password")
    .lean();
}

export async function createUser(data: CreateUserInput) {
  await connectDB();

  const existing = await User.findOne({ email: data.email.toLowerCase() });
  if (existing) throw new Error("Email is already registered");

  const hashedPassword = await bcrypt.hash(data.password, 12);
  const permissions = DEFAULT_ROLE_PERMISSIONS[data.role] ?? [];

  const user = await User.create({
    name: data.name,
    email: data.email.toLowerCase(),
    password: hashedPassword,
    role: data.role,
    permissions,
    branchIds: data.branchIds,
    organizationId: data.organizationId ?? null,
    phone: data.phone,
    isActive: true,
  });

  const { password: _pw, ...safeUser } = user.toObject();
  return safeUser;
}

export async function updateUser(userId: string, data: UpdateUserInput) {
  await connectDB();

  const existing = await User.findOne({ _id: userId, deletedAt: null });
  if (!existing) throw new Error("User not found");
  if (existing.role === "ADMIN") throw new Error("The admin account cannot be modified");

  const update: Record<string, unknown> = { ...data };

  if (data.role) {
    update.permissions = DEFAULT_ROLE_PERMISSIONS[data.role] ?? [];
  }

  const user = await User.findOneAndUpdate(
    { _id: userId, deletedAt: null },
    { $set: update },
    { new: true, runValidators: true }
  )
    .select("-password")
    .lean();

  if (!user) throw new Error("User not found");
  return user;
}

export async function deleteUser(userId: string, requesterId: string) {
  await connectDB();

  if (userId === requesterId) throw new Error("You cannot delete your own account");

  const user = await User.findOne({ _id: userId, deletedAt: null });
  if (!user) throw new Error("User not found");
  if (user.role === "ADMIN") throw new Error("Cannot delete the admin account");

  return User.findOneAndUpdate(
    { _id: userId },
    { $set: { deletedAt: new Date(), isActive: false } },
    { new: true }
  ).lean();
}
