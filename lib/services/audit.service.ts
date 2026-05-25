import "server-only";

import { connectDB } from "@/lib/db/connect";
import { AuditLog, type AuditAction } from "@/lib/db/models/AuditLog";
import logger from "@/lib/logger";

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
    await connectDB();
    await AuditLog.create({
      action: entry.action,
      performedBy: entry.actor.id,
      performedByName: entry.actor.name ?? null,
      targetId: entry.targetId ?? null,
      targetType: entry.targetType ?? null,
      metadata: entry.metadata ?? null,
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
  await connectDB();
  const { action, targetId, performedBy, page = 1, limit = 50 } = opts;
  const filter: Record<string, unknown> = {};
  if (action) filter.action = action;
  if (targetId) filter.targetId = targetId;
  if (performedBy) filter.performedBy = performedBy;

  const skip = (page - 1) * limit;
  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Math.min(limit, 100))
      .lean(),
    AuditLog.countDocuments(filter),
  ]);

  return { logs, total, pages: Math.ceil(total / limit) };
}
