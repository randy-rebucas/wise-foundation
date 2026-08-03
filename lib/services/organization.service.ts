import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import type { OrganizationType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getRolePermissions } from "@/lib/services/role.service";
import { TYPE_DEFAULT_SETTINGS, type OrganizationSettings } from "@/lib/organization/typeDefaults";
import { invalidateOrgCapabilitiesCache } from "@/lib/organization/capabilities";
import { writeAuditLog, type AuditActor } from "@/lib/services/audit.service";
import type { SessionUser } from "@/types";

export type { OrganizationType, OrganizationSettings };
export { TYPE_DEFAULT_SETTINGS };

const PASSWORD_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

function generateTempPassword(length = 12): string {
  const bytes = randomBytes(length);
  return Array.from(bytes, (b) => PASSWORD_CHARS[b % PASSWORD_CHARS.length]).join("");
}

export async function getOrganizations(type?: OrganizationType) {
  return prisma.organization.findMany({
    where: { deletedAt: null, ...(type ? { type } : {}) },
    include: { parent: { select: { name: true, type: true } } },
    orderBy: { name: "asc" },
  });
}

/** Organizations visible for B2B seller/buyer pickers (admin: all; org admin: self + parent + siblings / children). */
export async function getOrganizationsForOrderContext(user: SessionUser) {
  const select = {
    id: true,
    name: true,
    type: true,
    canSellRetail: true,
    canDistribute: true,
    hasInventory: true,
    commissionEnabled: true,
    canSubmitOrders: true,
  } as const;

  if (user.role === "ADMIN") {
    return prisma.organization.findMany({
      where: { deletedAt: null },
      select,
      orderBy: { name: "asc" },
    });
  }
  if (user.role !== "ORG_ADMIN" || !user.organizationId) {
    return [];
  }
  const oid = user.organizationId;
  const myOrg = await prisma.organization.findFirst({
    where: { id: oid, deletedAt: null },
    select: { parentOrganizationId: true },
  });
  const parentId = myOrg?.parentOrganizationId ?? null;

  if (parentId) {
    return prisma.organization.findMany({
      where: {
        deletedAt: null,
        OR: [{ id: oid }, { id: parentId }, { parentOrganizationId: parentId }],
      },
      select,
      orderBy: { name: "asc" },
    });
  }

  return prisma.organization.findMany({
    where: {
      deletedAt: null,
      OR: [{ id: oid }, { parentOrganizationId: oid }],
    },
    select,
    orderBy: { name: "asc" },
  });
}

export async function getOrganizationForCapabilities(id: string) {
  return prisma.organization.findFirst({
    where: { id, deletedAt: null, isActive: true },
    select: {
      id: true,
      name: true,
      type: true,
      commissionRate: true,
      canSellRetail: true,
      canDistribute: true,
      hasInventory: true,
      commissionEnabled: true,
      canSubmitOrders: true,
    },
  });
}

export async function getOrganizationById(id: string) {
  return prisma.organization.findFirst({
    where: { id, deletedAt: null },
    include: { parent: { select: { name: true, type: true } } },
  });
}

export async function createOrganization(
  data: {
    name: string;
    type: OrganizationType;
    parentOrganizationId?: string | null;
    settings?: Partial<OrganizationSettings>;
    contactPerson?: string;
    email?: string;
    phone?: string;
    address?: string;
    notes?: string;
  },
  actor?: AuditActor
) {
  if (data.type === "headquarters") {
    const existing = await prisma.organization.findFirst({
      where: { type: "headquarters", deletedAt: null },
    });
    if (existing) throw new Error("A headquarters organization already exists");
  }

  if (data.email) {
    const existingUser = await prisma.user.findFirst({
      where: { email: data.email.toLowerCase() },
    });
    if (existingUser) throw new Error("Email is already registered to a user");
  }

  const { settings, ...rest } = data;
  const mergedSettings = { ...TYPE_DEFAULT_SETTINGS[data.type], ...settings };
  const organization = await prisma.organization.create({
    data: { ...rest, ...mergedSettings },
  });

  if (actor) {
    void writeAuditLog({
      action: "organization.created",
      actor,
      targetId: organization.id,
      targetType: "Organization",
      metadata: { name: data.name, type: data.type },
    });
  }

  if (!data.email) {
    return { organization, tempPassword: null };
  }

  try {
    const tempPassword = generateTempPassword();
    const permissions = await getRolePermissions("ORG_ADMIN");
    await prisma.user.create({
      data: {
        name: data.contactPerson || data.name,
        email: data.email.toLowerCase(),
        password: await bcrypt.hash(tempPassword, 12),
        role: "ORG_ADMIN",
        permissions,
        organizationId: organization.id,
        phone: data.phone,
        isActive: true,
      },
    });
    return { organization, tempPassword };
  } catch (error) {
    await prisma.organization.delete({ where: { id: organization.id } });
    throw error;
  }
}

export async function updateOrganization(
  id: string,
  data: Partial<{
    name: string;
    type: OrganizationType;
    parentOrganizationId: string | null;
    settings: Partial<OrganizationSettings>;
    contactPerson: string;
    email: string;
    phone: string;
    address: string;
    notes: string;
    isActive: boolean;
  }>,
  actor?: AuditActor
) {
  if (data.type === "headquarters") {
    const existingHq = await prisma.organization.findFirst({
      where: { type: "headquarters", deletedAt: null, id: { not: id } },
    });
    if (existingHq) throw new Error("A headquarters organization already exists");
  }

  if (data.parentOrganizationId) {
    if (data.parentOrganizationId === id) {
      throw new Error("An organization cannot be its own parent");
    }
    // Walk up the proposed parent's ancestry to make sure it doesn't loop back to this org.
    let cursor: string | null = data.parentOrganizationId;
    const visited = new Set<string>();
    while (cursor) {
      if (cursor === id) throw new Error("That parent assignment would create a circular hierarchy");
      if (visited.has(cursor)) break;
      visited.add(cursor);
      const ancestor: { parentOrganizationId: string | null } | null =
        await prisma.organization.findFirst({
          where: { id: cursor, deletedAt: null },
          select: { parentOrganizationId: true },
        });
      cursor = ancestor?.parentOrganizationId ?? null;
    }
  }

  const existing = await prisma.organization.findFirst({ where: { id, deletedAt: null } });
  if (!existing) return null;

  const { settings, ...rest } = data;
  const result = await prisma.organization.update({
    where: { id },
    data: { ...rest, ...settings },
  });

  invalidateOrgCapabilitiesCache(id);
  if (actor) {
    void writeAuditLog({
      action: "organization.updated",
      actor,
      targetId: id,
      targetType: "Organization",
      metadata: { fields: Object.keys(data) },
    });
  }
  return result;
}

/** Generates a new temp password for the org's ORG_ADMIN user, creating one (using the org's email) if none exists yet. */
export async function resetOrgAdminPassword(organizationId: string, actor?: AuditActor) {
  const organization = await prisma.organization.findFirst({
    where: { id: organizationId, deletedAt: null },
  });
  if (!organization) throw new Error("Organization not found");

  const tempPassword = generateTempPassword();
  const hashedPassword = await bcrypt.hash(tempPassword, 12);

  const existingAdmin = await prisma.user.findFirst({
    where: { organizationId, role: "ORG_ADMIN", deletedAt: null },
  });

  if (existingAdmin) {
    await prisma.user.update({
      where: { id: existingAdmin.id },
      data: { password: hashedPassword },
    });
    if (actor) {
      void writeAuditLog({
        action: "organization.admin_password_reset",
        actor,
        targetId: organizationId,
        targetType: "Organization",
        metadata: { email: existingAdmin.email },
      });
    }
    return { email: existingAdmin.email, tempPassword };
  }

  if (!organization.email) {
    throw new Error("Organization has no email on file — add one before creating an admin account");
  }

  const conflictingUser = await prisma.user.findFirst({
    where: { email: organization.email.toLowerCase() },
  });
  if (conflictingUser) throw new Error("Organization email is already registered to a user");

  const permissions = await getRolePermissions("ORG_ADMIN");
  const user = await prisma.user.create({
    data: {
      name: organization.contactPerson || organization.name,
      email: organization.email.toLowerCase(),
      password: hashedPassword,
      role: "ORG_ADMIN",
      permissions,
      organizationId: organization.id,
      phone: organization.phone,
      isActive: true,
    },
  });

  return { email: user.email, tempPassword };
}

export async function deleteOrganization(id: string, actor?: AuditActor) {
  const organization = await prisma.organization.findFirst({ where: { id, deletedAt: null } });
  if (!organization) return null;

  invalidateOrgCapabilitiesCache(id);
  const result = await prisma.organization.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  if (actor) {
    void writeAuditLog({
      action: "organization.deleted",
      actor,
      targetId: id,
      targetType: "Organization",
      metadata: { name: organization.name },
    });
  }

  return result;
}
