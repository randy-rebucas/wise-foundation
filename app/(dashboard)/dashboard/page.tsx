import { auth } from "@/auth";
import { Header } from "@/components/layout/Header";
import { StatCard } from "@/components/shared/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Clock,
  ShoppingCart,
  Package,
} from "lucide-react";
import { connectDB } from "@/lib/db/connect";
import { Order } from "@/lib/db/models/Order";
import { Member } from "@/lib/db/models/Member";
import { Inventory } from "@/lib/db/models/Inventory";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { ORDER_PAID_STATUSES } from "@/types";

async function getDashboardStats() {
  await connectDB();

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [todayOrders, monthlyOrders, totalMembers, lowStockCount, recentOrders] =
    await Promise.all([
      Order.aggregate([
        {
          $match: {
            status: { $in: [...ORDER_PAID_STATUSES] },
            createdAt: { $gte: startOfDay },
          },
        },
        { $group: { _id: null, total: { $sum: "$total" }, count: { $sum: 1 } } },
      ]),
      Order.aggregate([
        {
          $match: {
            status: { $in: [...ORDER_PAID_STATUSES] },
            createdAt: { $gte: startOfMonth },
          },
        },
        { $group: { _id: null, total: { $sum: "$total" }, count: { $sum: 1 } } },
      ]),
      Member.countDocuments({ status: "active", deletedAt: null }),
      Inventory.countDocuments({
        $expr: { $lte: ["$quantity", "$lowStockThreshold"] },
      }),
      Order.find({ deletedAt: null }).sort({ createdAt: -1 }).limit(5).lean(),
    ]);

  return {
    todaySales: todayOrders[0]?.total ?? 0,
    todayOrders: todayOrders[0]?.count ?? 0,
    monthlySales: monthlyOrders[0]?.total ?? 0,
    monthlyOrders: monthlyOrders[0]?.count ?? 0,
    totalMembers,
    lowStockCount,
    recentOrders,
  };
}

export default async function DashboardPage() {
  const session = await auth();
  const stats = await getDashboardStats();

  return (
    <div className="flex flex-col">
      <Header title="Dashboard" subtitle={`Welcome back, ${session!.user.name}`} />
      <div className="flex-1 p-6 space-y-6">
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
            title="Active Members"
            value={stats.totalMembers.toLocaleString()}
            description="Registered members"
            icon={Users}
            iconClassName="bg-purple-100"
          />
          <StatCard
            title="Low Stock Alerts"
            value={stats.lowStockCount}
            description="Products need restocking"
            icon={AlertTriangle}
            iconClassName="bg-yellow-100"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
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
                    <div key={order._id.toString()} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{order.orderNumber}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(order.createdAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{formatCurrency(order.total)}</p>
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
                { label: "Add Member", href: "/members?action=new", icon: Users, color: "bg-purple-50 hover:bg-purple-100 text-purple-700" },
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
