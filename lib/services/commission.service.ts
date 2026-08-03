import type { CommissionStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog, type AuditActor } from "@/lib/services/audit.service";

export async function getCommissions(opts: {
  organizationId?: string;
  status?: CommissionStatus;
  page?: number;
  limit?: number;
}) {
  const { organizationId, status, page = 1, limit = 20 } = opts;

  const where: Record<string, unknown> = {};
  if (organizationId) where.organizationId = organizationId;
  if (status) where.status = status;

  const skip = (page - 1) * limit;
  const [records, total] = await Promise.all([
    prisma.commission.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        organization: { select: { name: true, type: true, commissionRate: true } },
        order: { select: { orderNumber: true, total: true, createdAt: true } },
        paidByUser: { select: { name: true } },
      },
    }),
    prisma.commission.count({ where }),
  ]);

  return { records, total, pages: Math.ceil(total / limit) };
}

export async function markCommissionPaid(id: string, userId: string, notes?: string, actor?: AuditActor) {
  const commission = await prisma.commission.findUnique({ where: { id } });
  if (!commission) throw new Error("Commission record not found");
  if (commission.status !== "pending") throw new Error("Only pending commissions can be marked paid");

  const result = await prisma.commission.update({
    where: { id },
    data: { status: "paid", paidAt: new Date(), paidBy: userId, notes: notes ?? commission.notes },
  });

  if (actor) {
    void writeAuditLog({
      action: "commission.paid",
      actor,
      targetId: id,
      targetType: "Commission",
      metadata: { notes },
    });
  }

  return result;
}

export async function cancelCommission(id: string, actor?: AuditActor) {
  const commission = await prisma.commission.findUnique({ where: { id } });
  if (!commission) throw new Error("Commission record not found");
  if (commission.status === "paid") throw new Error("Paid commissions cannot be cancelled");

  const result = await prisma.commission.update({ where: { id }, data: { status: "cancelled" } });

  if (actor) {
    void writeAuditLog({
      action: "commission.cancelled",
      actor,
      targetId: id,
      targetType: "Commission",
    });
  }

  return result;
}

export async function getCommissionSummary(organizationId?: string) {
  const where = organizationId ? { organizationId } : {};

  const [totals, count] = await Promise.all([
    prisma.commission.groupBy({
      by: ["status"],
      where,
      _sum: { amount: true },
    }),
    prisma.commission.count({ where }),
  ]);

  let totalPaid = 0;
  let totalPending = 0;
  for (const row of totals) {
    const amount = row._sum.amount ?? 0;
    if (row.status === "paid") totalPaid += amount;
    if (row.status === "pending") totalPending += amount;
  }

  return { totalEarned: totalPaid + totalPending, totalPaid, totalPending, count };
}
