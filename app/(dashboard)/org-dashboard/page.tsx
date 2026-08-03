import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getStaffHomePath } from "@/lib/navigation/staffHome";
import { requireStaffRoleHome } from "@/lib/navigation/requireStaffHome";
import { Header } from "@/components/layout/Header";
import { StatCard } from "@/components/shared/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  TrendingUp,
  Percent,
  Boxes,
  Clock,
  Building2,
  BarChart3,
  Store,
  LayoutGrid,
} from "lucide-react";
import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@prisma/client";
import { getPublicAppSettings } from "@/lib/services/appSettings.service";
import { formatCurrency, formatDateTimeInTimezone } from "@/lib/utils";
import { ORDER_PAID_STATUSES } from "@/types";
import Link from "next/link";

async function getOrgDashboardStats(organizationId: string) {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const paidStatuses = [...ORDER_PAID_STATUSES];

  // Revenue queries: only where this org is the seller
  const sellerMatch: Prisma.OrderWhereInput = {
    OR: [{ organizationId }, { sellerOrganizationId: organizationId }],
  };
  // Full match: any order involving this org (seller or buyer)
  const orgMatch: Prisma.OrderWhereInput = {
    OR: [
      { organizationId },
      { sellerOrganizationId: organizationId },
      { buyerOrganizationId: organizationId },
    ],
  };

  const [
    org,
    todayOrders,
    monthlyOrders,
    pendingOrders,
    commissionSummary,
    pendingCommission,
    inventorySummary,
    recentOrders,
  ] = await Promise.all([
    prisma.organization.findUnique({ where: { id: organizationId } }),
    prisma.order.aggregate({
      where: { ...sellerMatch, status: { in: paidStatuses }, createdAt: { gte: startOfDay }, deletedAt: null },
      _sum: { total: true },
      _count: { _all: true },
    }),
    prisma.order.aggregate({
      where: { ...sellerMatch, status: { in: paidStatuses }, createdAt: { gte: startOfMonth }, deletedAt: null },
      _sum: { total: true },
      _count: { _all: true },
    }),
    prisma.order.count({ where: { ...orgMatch, status: { in: ["pending", "approved"] }, deletedAt: null } }),
    prisma.commission.aggregate({
      where: { organizationId, status: { in: ["pending", "paid"] } },
      _sum: { amount: true },
    }),
    prisma.commission.aggregate({
      where: { organizationId, status: "pending" },
      _sum: { amount: true },
    }),
    prisma.organizationInventory.findMany({
      where: { organizationId },
      select: { quantity: true },
    }),
    prisma.order.findMany({
      where: { ...orgMatch, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);

  const totalProducts = inventorySummary.length;
  const totalUnits = inventorySummary.reduce((s, i) => s + i.quantity, 0);
  const lowStock = inventorySummary.filter((i) => i.quantity <= 5).length;

  return {
    org,
    todaySales: todayOrders._sum.total ?? 0,
    todayOrders: todayOrders._count._all,
    monthlySales: monthlyOrders._sum.total ?? 0,
    monthlyOrders: monthlyOrders._count._all,
    pendingOrders,
    totalEarned: commissionSummary._sum.amount ?? 0,
    pendingPayout: pendingCommission._sum.amount ?? 0,
    inventoryProducts: totalProducts,
    inventoryUnits: totalUnits,
    lowStockCount: lowStock,
    recentOrders,
  };
}

const STATUS_BADGE: Record<string, "default" | "success" | "secondary" | "destructive" | "warning"> = {
  pending: "warning",
  approved: "default",
  paid: "default",
  delivered: "default",
  completed: "success",
  cancelled: "destructive",
  refunded: "secondary",
};

const ORG_TYPE_COLOR: Record<string, string> = {
  distributor: "bg-blue-100 text-blue-800",
  franchise: "bg-emerald-100 text-emerald-800",
  partner: "bg-green-100 text-green-800",
};

export default async function OrgDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  requireStaffRoleHome(session, ["ORG_ADMIN"]);
  if (!session.user.organizationId) {
    redirect(getStaffHomePath(session.user));
  }

  const [stats, settings] = await Promise.all([
    getOrgDashboardStats(session.user.organizationId),
    getPublicAppSettings(),
  ]);
  const { currency, timezone } = settings;
  const org = stats.org;

  const hasInventory = org?.hasInventory ?? false;
  const hasCommission = org?.commissionEnabled ?? false;

  // Quick links aligned to ORG_ADMIN sidebar permissions
  const quickLinks = [
    { label: "My Panel", href: "/org-panel", icon: LayoutGrid, color: "bg-blue-50 hover:bg-blue-100 text-blue-700" },
    { label: "Reseller Sales", href: "/reseller-sales", icon: Store, color: "bg-orange-50 hover:bg-orange-100 text-orange-700" },
    { label: "Commissions", href: "/commissions", icon: Percent, color: "bg-green-50 hover:bg-green-100 text-green-700" },
    { label: "Reports", href: "/reports", icon: BarChart3, color: "bg-emerald-50 hover:bg-emerald-100 text-emerald-700" },
  ];

  return (
    <div className="flex flex-col">
      <Header
        title="Organization Dashboard"
        subtitle={
          org
            ? `${org.name} · ${org.type.charAt(0).toUpperCase() + org.type.slice(1)}`
            : `Welcome, ${session.user.name}`
        }
      />
      <div className="flex-1 p-6 space-y-6">
        {org && (
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{org.name}</span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ORG_TYPE_COLOR[org.type] ?? "bg-gray-100 text-gray-800"}`}>
              {org.type}
            </span>
          </div>
        )}

        {/* KPI Cards — shown conditionally by org capabilities */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Today's Sales"
            value={formatCurrency(stats.todaySales, currency)}
            description={`${stats.todayOrders} orders today`}
            icon={DollarSign}
            iconClassName="bg-green-100"
          />
          <StatCard
            title="Monthly Revenue"
            value={formatCurrency(stats.monthlySales, currency)}
            description={`${stats.monthlyOrders} orders this month`}
            icon={TrendingUp}
            iconClassName="bg-blue-100"
          />
          {hasCommission ? (
            <StatCard
              title="Commission Earned"
              value={formatCurrency(stats.totalEarned, currency)}
              description={`${formatCurrency(stats.pendingPayout, currency)} pending payout`}
              icon={Percent}
              iconClassName="bg-yellow-100"
            />
          ) : (
            <StatCard
              title="Pending Orders"
              value={stats.pendingOrders}
              description="Awaiting approval or payment"
              icon={Clock}
              iconClassName="bg-yellow-100"
            />
          )}
          {hasInventory ? (
            <StatCard
              title="Inventory"
              value={stats.inventoryUnits}
              description={`${stats.inventoryProducts} products · ${stats.lowStockCount} low stock`}
              icon={Boxes}
              iconClassName="bg-emerald-100"
            />
          ) : (
            <StatCard
              title="Total Orders"
              value={stats.monthlyOrders}
              description="Orders this month"
              icon={Clock}
              iconClassName="bg-emerald-100"
            />
          )}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Recent Orders */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Recent Orders
                </span>
                {stats.pendingOrders > 0 && (
                  <Badge variant="warning">{stats.pendingOrders} pending</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.recentOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No orders yet</p>
              ) : (
                <div className="space-y-3">
                  {stats.recentOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium font-mono">{order.orderNumber}</p>
                        <p className="text-xs text-muted-foreground">{formatDateTimeInTimezone(order.createdAt, timezone)}</p>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <p className="text-sm font-semibold">{formatCurrency(order.total, currency)}</p>
                        <Badge variant={STATUS_BADGE[order.status] ?? "secondary"} className="text-xs">
                          {order.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions — only pages ORG_ADMIN can access */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              {quickLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg transition-colors ${link.color}`}
                >
                  <link.icon className="h-6 w-6" />
                  <span className="text-sm font-medium">{link.label}</span>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
