import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/db/prisma";
import { getRolePermissions } from "@/lib/services/role.service";
import { writeAuditLog, type AuditActor } from "@/lib/services/audit.service";
import type { CreateUserInput, UpdateUserInput } from "@/lib/validations/user.schema";

/** Stable string for a user's `organizationId`, or null. */
export function userOrganizationIdString(
  user: { organizationId?: string | null } | null | undefined
): string | null {
  return user?.organizationId ?? null;
}

/** Treat blank string as null (mirrors the old "" -> ObjectId cast guard). */
function toOrganizationIdRef(id: string | null | undefined): string | null {
  if (id === undefined || id === null) return null;
  const t = String(id).trim();
  return t === "" ? null : t;
}

export async function getUsers(
  search?: string,
  role?: string,
  page = 1,
  limit = 20,
  organizationId?: string
) {
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { deletedAt: null };
  if (role) where.role = role;
  if (organizationId) where.organizationId = organizationId;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      omit: { password: true },
      include: { organization: { select: { name: true, type: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return { users, total, pages: Math.ceil(total / limit) };
}

export async function getUserById(userId: string) {
  return prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    omit: { password: true },
  });
}

export async function getMe(userId: string) {
  return prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    omit: { password: true },
    include: { organization: { select: { name: true } } },
  });
}

export async function updateMe(
  userId: string,
  data: { name?: string; phone?: string; avatar?: string }
) {
  const existing = await prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
  if (!existing) return null;
  return prisma.user.update({
    where: { id: userId },
    data,
    omit: { password: true },
    include: { organization: { select: { name: true } } },
  });
}

export async function createUser(data: CreateUserInput, actor?: AuditActor) {
  const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
  if (existing) throw new Error("Email is already registered");

  const hashedPassword = await bcrypt.hash(data.password, 12);
  const permissions = await getRolePermissions(data.role);

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email.toLowerCase(),
      password: hashedPassword,
      role: data.role,
      permissions,
      organizationId: toOrganizationIdRef(data.organizationId),
      phone: data.phone,
      isActive: true,
      branches: data.branchIds?.length
        ? { create: data.branchIds.map((branchId) => ({ branchId })) }
        : undefined,
    },
    omit: { password: true },
  });

  if (actor) {
    void writeAuditLog({
      action: "user.created",
      actor,
      targetId: user.id,
      targetType: "User",
      metadata: { role: data.role, email: data.email },
    });
  }

  return user;
}

export async function updateUser(userId: string, data: UpdateUserInput, actor?: AuditActor) {
  const existing = await prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
  if (!existing) throw new Error("User not found");
  if (existing.role === "ADMIN") throw new Error("The admin account cannot be modified");

  const { branchIds, organizationId, role, ...rest } = data;
  const update: Record<string, unknown> = { ...rest };

  if (Object.prototype.hasOwnProperty.call(data, "organizationId")) {
    update.organizationId = toOrganizationIdRef(organizationId);
  }

  const roleChanged = role && role !== existing.role;
  if (role) {
    update.role = role;
    update.permissions = await getRolePermissions(role);
  }

  if (branchIds) {
    update.branches = {
      deleteMany: {},
      create: branchIds.map((branchId) => ({ branchId })),
    };
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: update,
    omit: { password: true },
  });

  if (actor) {
    void writeAuditLog({
      action: roleChanged ? "user.role_changed" : "user.updated",
      actor,
      targetId: userId,
      targetType: "User",
      metadata: roleChanged
        ? { fromRole: existing.role, toRole: role }
        : { fields: Object.keys(data) },
    });
  }

  return user;
}

export async function deleteUser(userId: string, requesterId: string, actor?: AuditActor) {
  if (userId === requesterId) throw new Error("You cannot delete your own account");

  const user = await prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
  if (!user) throw new Error("User not found");
  if (user.role === "ADMIN") throw new Error("Cannot delete the admin account");

  const result = await prisma.user.update({
    where: { id: userId },
    data: { deletedAt: new Date(), isActive: false },
  });

  if (actor) {
    void writeAuditLog({
      action: "user.deleted",
      actor,
      targetId: userId,
      targetType: "User",
      metadata: { email: user.email, role: user.role },
    });
  }

  return result;
}

/** Delete multiple users, skipping any that fail (self, admin, not found, out of scope). */
export async function bulkDeleteUsers(
  userIds: string[],
  requesterId: string,
  actor?: AuditActor,
  scopeOrganizationId?: string
) {
  const deletedIds: string[] = [];
  const failures: { id: string; reason: string }[] = [];

  for (const userId of userIds) {
    try {
      if (scopeOrganizationId) {
        const target = await prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
        if (!target || userOrganizationIdString(target) !== scopeOrganizationId) {
          failures.push({ id: userId, reason: "User not found" });
          continue;
        }
      }
      await deleteUser(userId, requesterId, actor);
      deletedIds.push(userId);
    } catch (err) {
      failures.push({ id: userId, reason: err instanceof Error ? err.message : "Failed to delete" });
    }
  }

  return { deletedIds, failures };
}

/** Verify current password and set a new one. Throws if the current password doesn't match. */
export async function changeUserPassword(
  userId: string,
  currentPassword: string,
  newPassword: string
) {
  const user = await prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
  if (!user) throw new Error("User not found");

  const isValid = await bcrypt.compare(currentPassword, user.password);
  if (!isValid) throw new Error("Current password is incorrect");

  const hashed = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: userId }, data: { password: hashed } });
}

const PASSWORD_RESET_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

/** Issue a password-reset token for a non-customer user, if one exists with this email. */
export async function requestPasswordReset(email: string) {
  const user = await prisma.user.findFirst({
    where: { email, deletedAt: null, role: { not: "CUSTOMER" } },
  });
  if (!user) return null;

  const token = nanoid(40);
  const expiry = new Date(Date.now() + PASSWORD_RESET_EXPIRY_MS);

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordResetToken: token, passwordResetExpiry: expiry },
  });

  return { id: user.id, name: user.name, email: user.email, token };
}

/** Consume a password-reset token and set a new password. Returns false if the token is invalid/expired. */
export async function resetPasswordWithToken(token: string, newPassword: string): Promise<boolean> {
  const user = await prisma.user.findFirst({
    where: { passwordResetToken: token, passwordResetExpiry: { gt: new Date() }, deletedAt: null },
  });
  if (!user) return false;

  const hashed = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashed, passwordResetToken: null, passwordResetExpiry: null },
  });
  return true;
}

/** Anonymise PII rather than hard-delete so order records remain coherent. */
export async function anonymizeCustomerAccount(userId: string) {
  const user = await prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
  if (!user) return null;

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        name: "Deleted Account",
        email: `deleted+${userId}@deleted.invalid`,
        phone: null,
        avatar: null,
        isActive: false,
        deletedAt: new Date(),
        emailVerified: false,
        emailVerificationToken: null,
        emailVerificationExpiry: null,
      },
    }),
    prisma.userSavedAddress.deleteMany({ where: { userId } }),
    prisma.userPaymentMethod.deleteMany({ where: { userId } }),
    prisma.userWishlistItem.deleteMany({ where: { userId } }),
  ]);

  return user;
}

/** Permanently lock or unlock a user account. */
export async function setUserLock(userId: string, lock: boolean, actor?: AuditActor) {
  const user = await prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
  if (!user) throw new Error("User not found");
  if (user.role === "ADMIN") throw new Error("The admin account cannot be locked");

  await prisma.user.update({
    where: { id: userId },
    data: lock
      ? { lockedUntil: new Date("2099-01-01"), failedLoginAttempts: 0 }
      : { lockedUntil: null, failedLoginAttempts: 0 },
  });

  if (actor) {
    void writeAuditLog({
      action: "user.locked",
      actor,
      targetId: userId,
      targetType: "User",
      metadata: { locked: lock, email: user.email },
    });
  }
}
