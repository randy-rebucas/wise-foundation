import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db/connect";
import { User } from "@/lib/db/models/User";
import { Tenant } from "@/lib/db/models/Tenant";
import { Branch } from "@/lib/db/models/Branch";
import { Role, DEFAULT_ROLE_PERMISSIONS } from "@/lib/db/models/Role";
import type { RegisterInput } from "@/lib/validations/auth.schema";

export async function registerTenantWithOwner(input: RegisterInput) {
  await connectDB();

  // Check if slug is taken
  const existingTenant = await Tenant.findOne({ slug: input.tenantSlug });
  if (existingTenant) {
    throw new Error("Organization slug is already taken");
  }

  // Check if email is taken globally
  const existingUser = await User.findOne({ email: input.email });
  if (existingUser) {
    throw new Error("Email is already registered");
  }

  // Create tenant
  const tenant = await Tenant.create({
    name: input.tenantName,
    slug: input.tenantSlug,
    email: input.email,
    status: "trial",
  });

  // Create head office branch
  const branch = await Branch.create({
    tenantId: tenant._id,
    name: "Head Office",
    code: "HQ",
    address: "Head Office",
    isHeadOffice: true,
    isActive: true,
  });

  // Seed roles for this tenant
  const roleSeeds = await Promise.all(
    Object.entries(DEFAULT_ROLE_PERMISSIONS).map(([roleName, permissions]) =>
      Role.create({
        tenantId: tenant._id,
        name: roleName,
        displayName: roleName.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
        permissions,
        isSystem: true,
      })
    )
  );

  const ownerRole = roleSeeds.find((r) => r.name === "TENANT_OWNER");
  const ownerPermissions = DEFAULT_ROLE_PERMISSIONS.TENANT_OWNER;

  // Hash password
  const hashedPassword = await bcrypt.hash(input.password, 12);

  // Create owner user
  const user = await User.create({
    tenantId: tenant._id,
    branchIds: [branch._id],
    name: input.name,
    email: input.email,
    password: hashedPassword,
    role: "TENANT_OWNER",
    permissions: ownerPermissions,
    isActive: true,
  });

  // Set branch manager
  await Branch.updateOne({ _id: branch._id }, { managerId: user._id });

  return {
    tenant: { id: tenant._id.toString(), name: tenant.name, slug: tenant.slug },
    user: { id: user._id.toString(), name: user.name, email: user.email, role: user.role },
    branch: { id: branch._id.toString(), name: branch.name },
  };
}

export async function verifyCredentials(email: string, password: string) {
  await connectDB();

  const user = await User.findOne({ email: email.toLowerCase(), deletedAt: null, isActive: true })
    .select("+password")
    .lean();

  if (!user) return null;

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) return null;

  // Update last login
  await User.updateOne({ _id: user._id }, { lastLoginAt: new Date() });

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    tenantId: user.tenantId.toString(),
    branchIds: (user.branchIds as Array<{ toString(): string }>).map((b) => b.toString()),
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
    tenantId: user.tenantId.toString(),
    branchIds: (user.branchIds as Array<{ toString(): string }>).map((b) => b.toString()),
    permissions: user.permissions,
    avatar: user.avatar,
  };
}
