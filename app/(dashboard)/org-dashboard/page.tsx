import { auth } from "@/auth";
import { redirect } from "next/navigation";
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
  ShoppingCart,
  BarChart3,
} from "lucide-react";
import { connectDB } from "@/lib/db/connect";
import { Order } from "@/lib/db/models/Order";
import { Commission } from "@/lib/db/models/Commission";
import { OrganizationInventory } from "@/lib/db/models/OrganizationInventory";
import { Organization } from "@/lib/db/models/Organization";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import mongoose from "mongoose";
import Link from "next/link";

async function getOrgDashboardStats(organizationId: string) {
  await connectDB();

  const orgObjectId = new mongoose.Types.ObjectId(organizationId);
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const orgMatch = {
    $or: [
      { organizationId: orgObjectId },
      { sellerOrganizationId: orgObjectId },
    ],
  };

  const [
    org,
    todayOrders,
    monthlyOrders,
    pendingOrders,
    commissionSummary,
    inventorySummary,
    recentOrders,
  ] = await Promise.all([
    Organization.findById(organizationId).lean(),
    Order.aggregate([
      { $match: { ...orgMatch, status: { $in: ["paid", "completed"] }, createdAt: { $gte: startOfDay }, deletedAt: null } },
      { $group: { _id: null, total: { $sum: "$total" }, count: { $sum: 1 } } },
    ]),
    Order.aggregate([
      { $match: { ...orgMatch, status: { $in: ["paid", "completed"] }, createdAt: { $gte: startOfMonth }, deletedAt: null } },
      { $group: { _id: null, total: { $sum: "$total" }, count: { $sum: 1 } } },
    ]),
    Order.countDocuments({ ...orgMatch, status: { $in: ["pending", "approved"] }, deletedAt: null }),
    Commission.aggregate([
      { $match: { organizationId: orgObjectId } },
      {
        $group: {
          _id: null,
          totalEarned: { $sum: { $cond: [{ $in: ["$status", ["pending", "paid"]] }, "$amount", 0] } },
          pendingPayout: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, "$amount", 0] } },
        },
      },
    ]),
    OrganizationInventory.aggregate([
      { $match: { organizationId: orgObjectId } },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          totalUnits: { $sum: "$quantity" },
          lowStock: { $sum: { $cond: [{ $lte: ["$quantity", 5] }, 1, 0] } },
        },
      },
    ]),
    Order.find({ ...orgMatch, deletedAt: null })
      .sort({ createdAt: -1 })
      .limit(6)
      .lean(),
  ]);

  return {
    org,
    todaySales: todayOrders[0]?.total ?? 0,
    todayOrders: todayOrders[0]?.count ?? 0,
    monthlySales: monthlyOrders[0]?.total ?? 0,
    monthlyOrders: monthlyOrders[0]?.count ?? 0,
    pendingOrders,
    totalEarned: commissionSummary[0]?.totalEarned ?? 0,
    pendingPayout: commissionSummary[0]?.pendingPayout ?? 0,
    inventoryProducts: inventorySummary[0]?.totalProducts ?? 0,
    inventoryUnits: inventorySummary[0]?.totalUnits ?? 0,
    lowStockCount: inventorySummary[0]?.lowStock ?? 0,
    recentOrders,
  };
}

const STATUS_BADGE: Record<string, "default" | "success" | "secondary" | "destructive" | "warning"> = {
  pending: "warning",
  approved: "default",
  paid: "default",
  completed: "success",
  cancelled: "destructive",
  refunded: "secondary",
};

const ORG_TYPE_COLOR: Record<string, string> = {
  distributor: "bg-blue-100 text-blue-800",
  franchise: "bg-purple-100 text-purple-800",
  partner: "bg-green-100 text-green-800",
};

export default async function OrgDashboardPage() {
  const session = await auth();
  if (!session?.user?.organizationId) redirect("/dashboard");

  const stats = await getOrgDashboardStats(session.user.organizationId);
  const org = stats.org as { name: string; type: string } | null;

  const quickLinks = [
    { label: "POS", href: "/pos", icon: ShoppingCart, color: "bg-blue-50 hover:bg-blue-100 text-blue-700" },
    { label: "Orders", href: "/orders", icon: Clock, color: "bg-yellow-50 hover:bg-yellow-100 text-yellow-700" },
    { label: "Commissions", href: "/commissions", icon: Percent, color: "bg-green-50 hover:bg-green-100 text-green-700" },
    { label: "Reports", href: "/reports", icon: BarChart3, color: "bg-purple-50 hover:bg-purple-100 text-purple-700" },
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

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Today's Sales"
            value={formatCurrency(stats.todaySales)}
            description={`${stats.todayOrders} orders today`}
            icon={DollarSign}
            iconClassName="bg-green-100"
          />
          <StatCard
            title="Monthly Revenue"
            value={formatCurrency(stats.monthlySales)}
            description={`${stats.monthlyOrders} orders this month`}
            icon={TrendingUp}
            iconClassName="bg-blue-100"
          />
          <StatCard
            title="Commission Earned"
            value={formatCurrency(stats.totalEarned)}
            description={`${formatCurrency(stats.pendingPayout)} pending payout`}
            icon={Percent}
            iconClassName="bg-yellow-100"
          />
          <StatCard
            title="Inventory"
            value={stats.inventoryUnits}
            description={`${stats.inventoryProducts} products · ${stats.lowStockCount} low stock`}
            icon={Boxes}
            iconClassName="bg-purple-100"
          />
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
                    <div key={order._id.toString()} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium font-mono">{order.orderNumber}</p>
                        <p className="text-xs text-muted-foreground">{formatDateTime(order.createdAt)}</p>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <p className="text-sm font-semibold">{formatCurrency(order.total)}</p>
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

          {/* Quick Actions */}
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
