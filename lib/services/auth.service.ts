import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { loadOrganizationCapabilities } from "@/lib/organization/capabilities";
import { effectivePermissions } from "@/lib/permissions";
import { captureSecurityEvent } from "@/lib/services/security.service";
import { verifyTotpToken } from "@/lib/services/totp.service";
import type { OrganizationType, UserRole } from "@/types";
import type { InventorySurface, PosSurface } from "@/lib/organization/capabilities";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export type LoginAudience = "staff" | "customer";

export class AccountLockedError extends Error {
  constructor(public retryAt: Date) {
    super("Account locked");
    this.name = "AccountLockedError";
  }
}

export type CredentialResult =
  | null
  | { totpRequired: true; userId: string }
  | {
      id: string;
      name: string;
      email: string;
      role: UserRole;
      branchIds: string[];
      organizationId: string | null;
      organizationType: OrganizationType | null;
      organizationCapabilities: {
        inventorySurface: InventorySurface;
        posSurface: PosSurface;
      } | null;
      permissions: string[];
    };

export async function verifyCredentials(
  email: string,
  password: string,
  opts?: { audience?: LoginAudience; totpToken?: string }
): Promise<CredentialResult> {
  const audience: LoginAudience = opts?.audience ?? "staff";

  const user = await prisma.user.findFirst({
    where: { email: email.toLowerCase(), deletedAt: null, isActive: true },
    include: { branches: { select: { branchId: true } } },
  });

  if (!user) return null;

  if (audience === "staff" && user.role === "CUSTOMER") return null;
  if (audience === "customer" && user.role !== "CUSTOMER" && user.role !== "MEMBER") return null;

  // Enforce lockout
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new AccountLockedError(user.lockedUntil);
  }

  const isValid = await bcrypt.compare(password, user.password);

  if (!isValid) {
    const attempts = (user.failedLoginAttempts ?? 0) + 1;
    const shouldLock = attempts >= MAX_FAILED_ATTEMPTS;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: attempts,
        ...(shouldLock ? { lockedUntil: new Date(Date.now() + LOCKOUT_DURATION_MS) } : {}),
      },
    });
    if (shouldLock) {
      void captureSecurityEvent({
        type: "account.locked",
        userId: user.id,
        email: user.email,
        metadata: { audience, failedAttempts: attempts },
      });
    }
    return null;
  }

  // Enforce TOTP for roles that have it enabled
  if (user.totpEnabled) {
    const token = opts?.totpToken;
    if (!token) {
      // Signal to the caller that a second factor is required (no session created yet)
      return { totpRequired: true, userId: user.id };
    }
    const totpOk = await verifyTotpToken(user.id, token);
    if (!totpOk) return null;
  }

  // Successful login — clear lockout state
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date(), failedLoginAttempts: 0, lockedUntil: null },
  });

  const role = user.role as UserRole;
  const permissions = effectivePermissions({ role, permissions: user.permissions });
  const organizationId = user.organizationId ?? null;

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
    id: user.id,
    name: user.name,
    email: user.email,
    role,
    branchIds: user.branches.map((b) => b.branchId),
    organizationId,
    organizationType,
    organizationCapabilities,
    permissions,
  };
}

export async function getUserById(userId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    include: { branches: { select: { branchId: true } } },
  });
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    branchIds: user.branches.map((b) => b.branchId),
    permissions: user.permissions,
    avatar: user.avatar,
  };
}
