import { prisma } from "@/lib/db/prisma";
import { Prisma, type OrderStatus } from "@prisma/client";
import { ORDER_PAID_STATUSES } from "@/types";

const PAID_STATUSES = [...ORDER_PAID_STATUSES] as OrderStatus[];

// ─── Branch Reports ──────────────────────────────────────────────────────────

export async function getSalesSummary(branchId?: string, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const where: Prisma.OrderWhereInput = {
    status: { in: PAID_STATUSES },
    createdAt: { gte: startDate },
    deletedAt: null,
    ...(branchId ? { branchId } : {}),
  };

  const dailySales = await prisma.$queryRaw<
    { day: string; revenue: number; orders: bigint; discount: number }[]
  >`
    SELECT to_char("createdAt", 'YYYY-MM-DD') AS day,
           COALESCE(SUM(total), 0) AS revenue,
           COUNT(*) AS orders,
           COALESCE(SUM("discountAmount"), 0) AS discount
    FROM "Order"
    WHERE status = ANY(${PAID_STATUSES}::"OrderStatus"[])
      AND "createdAt" >= ${startDate}
      AND "deletedAt" IS NULL
      ${branchId ? Prisma.sql`AND "branchId" = ${branchId}::uuid` : Prisma.empty}
    GROUP BY day
    ORDER BY day ASC
  `;

  const [totals] = await Promise.all([
    prisma.order.aggregate({
      where,
      _sum: { total: true, discountAmount: true },
      _count: { _all: true },
      _avg: { total: true },
    }),
  ]);

  return {
    dailySales: dailySales.map((r) => ({
      _id: r.day,
      revenue: Number(r.revenue),
      orders: Number(r.orders),
      discount: Number(r.discount),
    })),
    summary: {
      totalRevenue: totals._sum.total ?? 0,
      totalOrders: totals._count._all,
      totalDiscount: totals._sum.discountAmount ?? 0,
      avgOrderValue: totals._avg.total ?? 0,
    },
  };
}

export async function getTopProducts(branchId?: string, limit = 10) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const rows = await prisma.$queryRaw<
    { productId: string; totalQuantity: bigint; totalRevenue: number; name: string; sku: string; category: string }[]
  >`
    SELECT oi."productId", SUM(oi.quantity) AS "totalQuantity", SUM(oi.total) AS "totalRevenue",
           p.name, p.sku, p.category::text AS category
    FROM "OrderItem" oi
    JOIN "Product" p ON p.id = oi."productId"
    WHERE oi."createdAt" >= ${startOfMonth}
      ${branchId ? Prisma.sql`AND oi."branchId" = ${branchId}::uuid` : Prisma.empty}
    GROUP BY oi."productId", p.name, p.sku, p.category
    ORDER BY "totalRevenue" DESC
    LIMIT ${limit}
  `;

  return rows.map((r) => ({
    productName: r.name,
    sku: r.sku,
    category: r.category,
    totalQuantity: Number(r.totalQuantity),
    totalRevenue: Number(r.totalRevenue),
  }));
}

export async function getBranchPerformance() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [performance, branches] = await Promise.all([
    prisma.order.groupBy({
      by: ["branchId"],
      where: {
        status: { in: PAID_STATUSES },
        createdAt: { gte: startOfMonth },
        deletedAt: null,
        branchId: { not: null },
      },
      _sum: { total: true },
      _count: { _all: true },
      orderBy: { _sum: { total: "desc" } },
    }),
    prisma.branch.findMany({ where: { deletedAt: null }, select: { id: true, name: true, code: true } }),
  ]);

  const branchMap = new Map(branches.map((b) => [b.id, b]));

  return performance
    .filter((p) => p.branchId)
    .map((p) => ({
      branchId: p.branchId!,
      branchName: branchMap.get(p.branchId!)?.name ?? "Unknown",
      branchCode: branchMap.get(p.branchId!)?.code ?? "?",
      revenue: p._sum.total ?? 0,
      orders: p._count._all,
    }));
}

export async function getInventoryAlerts() {
  const items = await prisma.inventory.findMany({
    where: { lowStockThreshold: { gt: 0 } },
    include: {
      product: { select: { name: true, sku: true, category: true } },
      branch: { select: { name: true, code: true } },
    },
    take: 100,
  });
  return items.filter((i) => i.quantity <= i.lowStockThreshold).slice(0, 20);
}

export async function getMemberStats() {
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const [total, active, newThisMonth] = await Promise.all([
    prisma.member.count({ where: { deletedAt: null } }),
    prisma.member.count({ where: { status: "active", deletedAt: null } }),
    prisma.member.count({ where: { deletedAt: null, joinedAt: { gte: startOfMonth } } }),
  ]);
  return { total, active, newThisMonth };
}

// ─── Organization Reports ────────────────────────────────────────────────────

export async function getOrgSalesSummary(organizationId?: string, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const orgWhere: Prisma.OrderWhereInput = organizationId
    ? { OR: [{ organizationId }, { sellerOrganizationId: organizationId }] }
    : {};

  const where: Prisma.OrderWhereInput = {
    status: { in: PAID_STATUSES },
    createdAt: { gte: startDate },
    deletedAt: null,
    ...orgWhere,
  };

  const orgFilterSql = organizationId
    ? Prisma.sql`AND ("organizationId" = ${organizationId}::uuid OR "sellerOrganizationId" = ${organizationId}::uuid)`
    : Prisma.empty;

  const [dailySales, totals, byType] = await Promise.all([
    prisma.$queryRaw<{ day: string; revenue: number; orders: bigint }[]>`
      SELECT to_char("createdAt", 'YYYY-MM-DD') AS day,
             COALESCE(SUM(total), 0) AS revenue,
             COUNT(*) AS orders
      FROM "Order"
      WHERE status = ANY(${PAID_STATUSES}::"OrderStatus"[])
        AND "createdAt" >= ${startDate}
        AND "deletedAt" IS NULL
        ${orgFilterSql}
      GROUP BY day
      ORDER BY day ASC
    `,
    prisma.order.aggregate({
      where,
      _sum: { total: true, discountAmount: true },
      _count: { _all: true },
      _avg: { total: true },
    }),
    prisma.order.groupBy({
      by: ["type"],
      where,
      _sum: { total: true },
      _count: { _all: true },
    }),
  ]);

  return {
    dailySales: dailySales.map((r) => ({ _id: r.day, revenue: Number(r.revenue), orders: Number(r.orders) })),
    summary: {
      totalRevenue: totals._sum.total ?? 0,
      totalOrders: totals._count._all,
      totalDiscount: totals._sum.discountAmount ?? 0,
      avgOrderValue: totals._avg.total ?? 0,
    },
    byType: byType.map((r) => ({ _id: r.type, revenue: r._sum.total ?? 0, orders: r._count._all })),
  };
}

export async function getTopOrganizations(days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  // Aggregate seller-side orders (DISTRIBUTOR + B2B sales)
  const sellerPerf = await prisma.$queryRaw<
    { orgId: string; name: string; type: string; commissionRate: number; revenue: number; orders: bigint }[]
  >`
    SELECT o."sellerOrganizationId" AS "orgId", org.name, org.type::text AS type, org."commissionRate",
           SUM(o.total) AS revenue, COUNT(*) AS orders
    FROM "Order" o
    JOIN "Organization" org ON org.id = o."sellerOrganizationId"
    WHERE o.status = ANY(${PAID_STATUSES}::"OrderStatus"[])
      AND o."createdAt" >= ${startDate}
      AND o."deletedAt" IS NULL
      AND o."sellerOrganizationId" IS NOT NULL
    GROUP BY o."sellerOrganizationId", org.name, org.type, org."commissionRate"
    ORDER BY revenue DESC
    LIMIT 10
  `;

  // Commissions summary per org
  const commSummary = await prisma.commission.groupBy({
    by: ["organizationId"],
    where: { status: { in: ["pending", "paid"] } },
    _sum: { amount: true },
  });
  const pendingByOrg = await prisma.commission.groupBy({
    by: ["organizationId"],
    where: { status: "pending" },
    _sum: { amount: true },
  });
  const commMap = new Map(commSummary.map((c) => [c.organizationId, c._sum.amount ?? 0]));
  const pendingMap = new Map(pendingByOrg.map((c) => [c.organizationId, c._sum.amount ?? 0]));

  return sellerPerf.map((o) => ({
    orgId: o.orgId,
    name: o.name,
    type: o.type,
    commissionRate: o.commissionRate,
    revenue: Number(o.revenue),
    orders: Number(o.orders),
    totalCommission: commMap.get(o.orgId) ?? 0,
    pendingCommission: pendingMap.get(o.orgId) ?? 0,
  }));
}

export async function getDistributionSummary(days = 30, organizationId?: string) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const orgTypeCounts = await prisma.organization.groupBy({
    by: ["type"],
    where: { deletedAt: null, isActive: true },
    _count: { _all: true },
  });
  const orgTypeMap = new Map(orgTypeCounts.map((r) => [r.type, r._count._all]));
  const orgsByType = {
    distributor: orgTypeMap.get("distributor") ?? 0,
    franchise: orgTypeMap.get("franchise") ?? 0,
    partner: orgTypeMap.get("partner") ?? 0,
    headquarters: orgTypeMap.get("headquarters") ?? 0,
  };

  // Revenue by org type (via seller org join)
  const revenueByType = await prisma.$queryRaw<{ type: string; revenue: number; orders: bigint }[]>`
    SELECT org.type::text AS type, SUM(o.total) AS revenue, COUNT(*) AS orders
    FROM "Order" o
    JOIN "Organization" org ON org.id = o."sellerOrganizationId"
    WHERE o.status = ANY(${PAID_STATUSES}::"OrderStatus"[])
      AND o."createdAt" >= ${startDate}
      AND o."deletedAt" IS NULL
      AND o."sellerOrganizationId" IS NOT NULL
    GROUP BY org.type
  `;

  const revenueMap: Record<string, { revenue: number; orders: number }> = {};
  for (const r of revenueByType) {
    revenueMap[r.type] = { revenue: Number(r.revenue), orders: Number(r.orders) };
  }

  const commissionWhere: Prisma.CommissionWhereInput = {
    status: { in: ["pending", "paid"] },
    ...(organizationId ? { organizationId } : {}),
  };
  const totalCommissions = await prisma.commission.aggregate({
    where: commissionWhere,
    _sum: { amount: true },
  });
  const pendingCommissions = await prisma.commission.aggregate({
    where: { ...commissionWhere, status: "pending" },
    _sum: { amount: true },
  });

  return {
    orgCounts: orgsByType,
    revenueByType: {
      distributor: revenueMap.distributor ?? { revenue: 0, orders: 0 },
      franchise: revenueMap.franchise ?? { revenue: 0, orders: 0 },
      partner: revenueMap.partner ?? { revenue: 0, orders: 0 },
      headquarters: revenueMap.headquarters ?? { revenue: 0, orders: 0 },
    },
    commissions: {
      total: totalCommissions._sum.amount ?? 0,
      pending: pendingCommissions._sum.amount ?? 0,
    },
  };
}

export async function getOrgInventorySummary(organizationId?: string) {
  const rows = await prisma.$queryRaw<
    {
      orgId: string;
      orgName: string;
      orgType: string;
      totalProducts: bigint;
      totalUnits: bigint;
      lowStockCount: bigint;
    }[]
  >`
    SELECT oi."organizationId" AS "orgId", org.name AS "orgName", org.type::text AS "orgType",
           COUNT(*) AS "totalProducts",
           COALESCE(SUM(oi.quantity), 0) AS "totalUnits",
           SUM(CASE WHEN oi.quantity <= 5 THEN 1 ELSE 0 END) AS "lowStockCount"
    FROM "OrganizationInventory" oi
    JOIN "Organization" org ON org.id = oi."organizationId"
    ${organizationId ? Prisma.sql`WHERE oi."organizationId" = ${organizationId}::uuid` : Prisma.empty}
    GROUP BY oi."organizationId", org.name, org.type
    ORDER BY "totalUnits" DESC
  `;

  return rows.map((r) => ({
    orgId: r.orgId,
    orgName: r.orgName,
    orgType: r.orgType,
    totalProducts: Number(r.totalProducts),
    totalUnits: Number(r.totalUnits),
    lowStockCount: Number(r.lowStockCount),
  }));
}
