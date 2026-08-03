import { OrgPermissionKey as PrismaOrgPermissionKey } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog, type AuditActor } from "@/lib/services/audit.service";

/**
 * Public string-literal form used throughout the app (routes, permission
 * checks). Maps 1:1 to the Prisma `OrgPermissionKey` enum, whose members are
 * `@map`-ed back to these exact literals at the DB layer.
 */
export type OrgPermissionKey =
  | "sell:retail"
  | "distribute:stock"
  | "has:inventory"
  | "earn:commission"
  | "submit:orders";

const TO_PRISMA_ENUM: Record<OrgPermissionKey, PrismaOrgPermissionKey> = {
  "sell:retail": PrismaOrgPermissionKey.sell_retail,
  "distribute:stock": PrismaOrgPermissionKey.distribute_stock,
  "has:inventory": PrismaOrgPermissionKey.has_inventory,
  "earn:commission": PrismaOrgPermissionKey.earn_commission,
  "submit:orders": PrismaOrgPermissionKey.submit_orders,
};

const FROM_PRISMA_ENUM: Record<PrismaOrgPermissionKey, OrgPermissionKey> = {
  [PrismaOrgPermissionKey.sell_retail]: "sell:retail",
  [PrismaOrgPermissionKey.distribute_stock]: "distribute:stock",
  [PrismaOrgPermissionKey.has_inventory]: "has:inventory",
  [PrismaOrgPermissionKey.earn_commission]: "earn:commission",
  [PrismaOrgPermissionKey.submit_orders]: "submit:orders",
};

const PERMISSION_TO_SETTING_COLUMN: Record<
  OrgPermissionKey,
  "canSellRetail" | "canDistribute" | "hasInventory" | "commissionEnabled" | "canSubmitOrders"
> = {
  "sell:retail": "canSellRetail",
  "distribute:stock": "canDistribute",
  "has:inventory": "hasInventory",
  "earn:commission": "commissionEnabled",
  "submit:orders": "canSubmitOrders",
};

export async function getOrgPermissions(organizationId: string) {
  const rows = await prisma.orgPermission.findMany({
    where: { organizationId },
    include: { grantedByUser: { select: { name: true } } },
    orderBy: { permission: "asc" },
  });
  return rows.map((r) => ({ ...r, permission: FROM_PRISMA_ENUM[r.permission] }));
}

export async function setOrgPermission(
  organizationId: string,
  permission: OrgPermissionKey,
  isGranted: boolean,
  grantedBy: string,
  opts?: { expiresAt?: Date | null; notes?: string; actor?: AuditActor }
) {
  const prismaPermission = TO_PRISMA_ENUM[permission];

  const [record] = await prisma.$transaction([
    prisma.orgPermission.upsert({
      where: { organizationId_permission: { organizationId, permission: prismaPermission } },
      create: {
        organizationId,
        permission: prismaPermission,
        isGranted,
        grantedBy,
        expiresAt: opts?.expiresAt ?? null,
        notes: opts?.notes,
      },
      update: {
        isGranted,
        grantedBy,
        expiresAt: opts?.expiresAt ?? null,
        notes: opts?.notes,
      },
    }),
    // Sync to Organization's flattened settings columns for quick-read access
    prisma.organization.update({
      where: { id: organizationId },
      data: { [PERMISSION_TO_SETTING_COLUMN[permission]]: isGranted },
    }),
  ]);

  if (opts?.actor) {
    void writeAuditLog({
      action: "organization.permission_changed",
      actor: opts.actor,
      targetId: organizationId,
      targetType: "Organization",
      metadata: { permission, isGranted },
    });
  }

  return { ...record, permission: FROM_PRISMA_ENUM[record.permission] };
}

export async function hasOrgPermission(
  organizationId: string,
  permission: OrgPermissionKey
): Promise<boolean> {
  const record = await prisma.orgPermission.findUnique({
    where: {
      organizationId_permission: { organizationId, permission: TO_PRISMA_ENUM[permission] },
    },
  });
  if (!record) {
    // Fall back to Organization's flattened settings columns if no explicit
    // permission record exists.
    const org = await prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) return false;
    const column = PERMISSION_TO_SETTING_COLUMN[permission];
    return !!org[column];
  }
  if (record.expiresAt && record.expiresAt < new Date()) return false;
  return record.isGranted;
}
