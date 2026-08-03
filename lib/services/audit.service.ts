import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import logger from "@/lib/logger";

export type AuditAction =
  | "user.created"
  | "user.updated"
  | "user.role_changed"
  | "user.deleted"
  | "user.locked"
  | "settings.updated"
  | "order.refunded"
  | "organization.created"
  | "organization.updated"
  | "organization.deleted"
  | "branch.updated"
  | "branch.deleted"
  | "member.status_changed"
  | "member.deleted"
  | "commission.paid"
  | "commission.cancelled"
  | "product.created"
  | "product.updated"
  | "product.deleted"
  | "product.cloned"
  | "product.variant_created"
  | "product.variant_updated"
  | "product.variant_deleted"
  | "order.created"
  | "order.status_changed"
  | "abandoned_checkout.deleted"
  | "reseller_order.created"
  | "inventory.threshold_updated"
  | "inventory.stock_moved"
  | "inventory.org_transferred"
  | "supplier.created"
  | "supplier.updated"
  | "supplier.deleted"
  | "organization.permission_changed"
  | "organization.admin_password_reset"
  | "branch.created"
  | "branch.user_assigned"
  | "branch.user_removed"
  | "member.created"
  | "settings.logo_updated"
  | "settings.logo_removed"
  | "settings.maintenance_toggled"
  | "settings.roles_synced"
  | "user.2fa_enabled"
  | "user.2fa_disabled"
  | "user.password_changed"
  | "user.account_deleted"
  | "review.created"
  | "review.deleted"
  | "review.featured_changed"
  | "ad.created"
  | "ad.updated"
  | "ad.deleted"
  | "blog_post.created"
  | "blog_post.updated"
  | "blog_post.deleted"
  | "coupon.created"
  | "coupon.updated"
  | "coupon.deleted"
  | "db.backup_created"
  | "db.backup_deleted"
  | "db.restored"
  | "db.transferred";

export type AuditActor = {
  id: string;
  name?: string | null;
};

export type AuditEntry = {
  action: AuditAction;
  actor: AuditActor;
  targetId?: string | null;
  targetType?: string | null;
  metadata?: Record<string, unknown> | null;
};

/** Fire-and-forget audit write. Never throws — a logging failure must not break the operation. */
export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: entry.action,
        performedBy: entry.actor.id,
        performedByName: entry.actor.name ?? null,
        targetId: entry.targetId ?? null,
        targetType: entry.targetType ?? null,
        metadata: (entry.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (err) {
    logger.error({ err, entry }, "Failed to write audit log — operation continues");
  }
}

export async function getAuditLogs(opts: {
  action?: AuditAction;
  targetId?: string;
  performedBy?: string;
  page?: number;
  limit?: number;
}) {
  const { action, targetId, performedBy, page = 1, limit = 50 } = opts;
  const where: Prisma.AuditLogWhereInput = {};
  if (action) where.action = action;
  if (targetId) where.targetId = targetId;
  if (performedBy) where.performedBy = performedBy;

  const skip = (page - 1) * limit;
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: Math.min(limit, 100),
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, total, pages: Math.ceil(total / limit) };
}
