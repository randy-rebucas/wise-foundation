import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db/connect";
import { User } from "@/lib/db/models/User";

export async function verifyCredentials(email: string, password: string) {
  await connectDB();

  const user = await User.findOne({ email: email.toLowerCase(), deletedAt: null, isActive: true })
    .select("+password")
    .lean();

  if (!user) return null;

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) return null;

  await User.updateOne({ _id: user._id }, { lastLoginAt: new Date() });

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    branchIds: (user.branchIds as Array<{ toString(): string }>).map((b) => b.toString()),
    organizationId: user.organizationId?.toString() ?? null,
    permissions: user.permissions,
  };
}

export async function getUserById(userId: string) {
  await connectDB();
  const user = await User.findOne({ _id: userId, deletedAt: null }).lean();
  if (!user) return null;
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    branchIds: (user.branchIds as Array<{ toString(): string }>).map((b) => b.toString()),
    permissions: user.permissions,
    avatar: user.avatar,
  };
}
