import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db/connect";
import { User } from "@/lib/db/models/User";
import { loadOrganizationCapabilities } from "@/lib/organization/capabilities";
import { effectivePermissions } from "@/lib/permissions";
import type { OrganizationType, UserRole } from "@/types";
import type { InventorySurface, PosSurface } from "@/lib/organization/capabilities";

export type LoginAudience = "staff" | "customer";

export async function verifyCredentials(
  email: string,
  password: string,
  opts?: { audience?: LoginAudience }
) {
  await connectDB();

  const audience: LoginAudience = opts?.audience ?? "staff";

  const user = await User.findOne({ email: email.toLowerCase(), deletedAt: null, isActive: true })
    .select("+password")
    .lean();

  if (!user) return null;

  if (audience === "staff" && user.role === "CUSTOMER") {
    return null;
  }
  if (audience === "customer" && user.role !== "CUSTOMER") {
    return null;
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) return null;

  await User.updateOne({ _id: user._id }, { lastLoginAt: new Date() });

  const role = user.role as UserRole;
  const permissions = effectivePermissions({ role, permissions: user.permissions });
  const organizationId = user.organizationId?.toString() ?? null;

  let organizationType: OrganizationType | null = null;
  let organizationCapabilities: {
    inventorySurface: InventorySurface;
    posSurface: PosSurface;
  } | null = null;

  if (organizationId) {
    const caps = await loadOrganizationCapabilities(organizationId);
    if (caps) {
      organizationType = caps.type;
      organizationCapabilities = {
        inventorySurface: caps.inventorySurface,
        posSurface: caps.posSurface,
      };
    }
  }

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role,
    branchIds: (user.branchIds as Array<{ toString(): string }>).map((b) => b.toString()),
    organizationId,
    organizationType,
    organizationCapabilities,
    permissions,
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
