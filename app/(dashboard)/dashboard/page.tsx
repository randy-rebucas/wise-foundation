import { auth } from "@/auth";
import { requireStaffRoleHome } from "@/lib/navigation/requireStaffHome";
import logger from "@/lib/logger";
import { Header } from "@/components/layout/Header";
import { StatCard } from "@/components/shared/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Users,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Clock,
  ShoppingCart,
  Package,
} from "lucide-react";
import { prisma } from "@/lib/db/prisma";
import { getPublicAppSettings, toPublicAppSettings } from "@/lib/services/appSettings.service";
import type { PublicAppSettings } from "@/lib/types/appSettings";
import { formatCurrency, formatDateTimeInTimezone } from "@/lib/utils";
import { ORDER_PAID_STATUSES } from "@/types";

interface RecentOrderRow {
  _id: string;
  orderNumber: string;
  total: number;
  createdAt: Date;
  status: string;
}

interface DashboardStats {
  todaySales: number;
  todayOrders: number;
  monthlySales: number;
  monthlyOrders: number;
  totalMembers: number;
  lowStockCount: number;
  recentOrders: RecentOrderRow[];
}

const emptyDashboardStats: DashboardStats = {
  todaySales: 0,
  todayOrders: 0,
  monthlySales: 0,
  monthlyOrders: 0,
  totalMembers: 0,
  lowStockCount: 0,
  recentOrders: [],
};

async function getDashboardStats(): Promise<DashboardStats> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const paidStatuses = [...ORDER_PAID_STATUSES];

  const [todayOrders, monthlyOrders, totalMembers, lowStockItems, recentOrders] =
    await Promise.all([
      prisma.order.aggregate({
        where: { status: { in: paidStatuses }, createdAt: { gte: startOfDay } },
        _sum: { total: true },
        _count: { _all: true },
      }),
      prisma.order.aggregate({
        where: { status: { in: paidStatuses }, createdAt: { gte: startOfMonth } },
        _sum: { total: true },
        _count: { _all: true },
      }),
      prisma.member.count({ where: { status: "active", deletedAt: null } }),
      prisma.inventory.findMany({ select: { quantity: true, lowStockThreshold: true } }),
      prisma.order.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

  const lowStockCount = lowStockItems.filter((i) => i.quantity <= i.lowStockThreshold).length;

  return {
    todaySales: todayOrders._sum.total ?? 0,
    todayOrders: todayOrders._count._all,
    monthlySales: monthlyOrders._sum.total ?? 0,
    monthlyOrders: monthlyOrders._count._all,
    totalMembers,
    lowStockCount,
    recentOrders: recentOrders.map((o) => ({
      _id: o.id,
      orderNumber: o.orderNumber,
      total: o.total,
      createdAt: o.createdAt,
      status: o.status,
    })),
  };
}

export default async function DashboardPage() {
  const session = await auth();
  requireStaffRoleHome(session, ["ADMIN"]);

  let settings: PublicAppSettings;
  try {
    settings = await getPublicAppSettings();
  } catch {
    settings = toPublicAppSettings(null);
  }
  const { currency, timezone } = settings;

  let stats = emptyDashboardStats;
  let statsError: string | null = null;
  try {
    stats = await getDashboardStats();
  } catch (err) {
    logger.error({ err }, "[dashboard] getDashboardStats failed");
    statsError =
      err instanceof Error ? err.message : "Unable to load dashboard statistics.";
  }

  const displayName = session?.user?.name?.trim() || "there";

  return (
    <div className="flex flex-col">
      <Header title="Dashboard" subtitle={`Welcome back, ${displayName}`} />
      <div className="flex-1 space-y-4 p-4 sm:space-y-6 sm:p-6">
        {statsError && (
          <Alert variant="destructive">
            <AlertDescription>
              {statsError} Statistics below show zeros until this is resolved.
            </AlertDescription>
          </Alert>
        )}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
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
          <StatCard
            title="Active Members"
            value={stats.totalMembers.toLocaleString()}
            description="Registered members"
            icon={Users}
            iconClassName="bg-emerald-100"
          />
          <StatCard
            title="Low Stock Alerts"
            value={stats.lowStockCount}
            description="Products need restocking"
            icon={AlertTriangle}
            iconClassName="bg-yellow-100"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4" />
                Recent Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.recentOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No orders yet</p>
              ) : (
                <div className="space-y-3">
                  {stats.recentOrders.map((order) => (
                    <div key={order._id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{order.orderNumber}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTimeInTimezone(order.createdAt, timezone)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{formatCurrency(order.total, currency)}</p>
                        <Badge
                          variant={
                            order.status === "completed"
                              ? "success"
                              : order.status === "delivered"
                              ? "default"
                              : order.status === "paid"
                              ? "default"
                              : order.status === "cancelled"
                              ? "destructive"
                              : "secondary"
                          }
                          className="text-xs"
                        >
                          {order.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="h-4 w-4" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              {[
                { label: "New Sale", href: "/pos", icon: ShoppingCart, color: "bg-blue-50 hover:bg-blue-100 text-blue-700" },
                { label: "Add Product", href: "/products?action=new", icon: Package, color: "bg-green-50 hover:bg-green-100 text-green-700" },
                { label: "Add Member", href: "/members?action=new", icon: Users, color: "bg-emerald-50 hover:bg-emerald-100 text-emerald-700" },
                { label: "View Reports", href: "/reports", icon: TrendingUp, color: "bg-orange-50 hover:bg-orange-100 text-orange-700" },
              ].map((action) => (
                <a
                  key={action.href}
                  href={action.href}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg transition-colors ${action.color}`}
                >
                  <action.icon className="h-6 w-6" />
                  <span className="text-sm font-medium">{action.label}</span>
                </a>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
