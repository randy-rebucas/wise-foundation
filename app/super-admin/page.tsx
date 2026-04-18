import { auth } from "@/auth";
import { getSystemStats } from "@/lib/services/superadmin.service";
import { StatCard } from "@/components/shared/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Users,
  ShoppingCart,
  DollarSign,
  CheckCircle2,
  Clock,
  XCircle,
  ExternalLink,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

function statusVariant(status: string): "success" | "secondary" | "destructive" {
  if (status === "active") return "success";
  if (status === "suspended") return "destructive";
  return "secondary";
}

export default async function SuperAdminPage() {
  const session = await auth();
  const stats = await getSystemStats();

  return (
    <div className="flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 flex h-16 items-center border-b bg-background px-6">
        <div>
          <h1 className="text-xl font-semibold">Overview</h1>
          <p className="text-sm text-muted-foreground">Welcome back, {session?.user?.name}</p>
        </div>
      </header>

      <div className="flex-1 p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Tenants"
            value={stats.totalTenants}
            description={`${stats.activeTenants} active · ${stats.trialTenants} trial · ${stats.suspendedTenants} suspended`}
            icon={Building2}
            iconClassName="bg-blue-100"
          />
          <StatCard
            title="Total Users"
            value={stats.totalUsers.toLocaleString()}
            description="Across all tenants"
            icon={Users}
            iconClassName="bg-purple-100"
          />
          <StatCard
            title="Total Orders"
            value={stats.totalOrders.toLocaleString()}
            description="Paid & completed"
            icon={ShoppingCart}
            iconClassName="bg-green-100"
          />
          <StatCard
            title="Platform Revenue"
            value={formatCurrency(stats.totalRevenue)}
            description="All-time across tenants"
            icon={DollarSign}
            iconClassName="bg-yellow-100"
          />
        </div>

        {/* Tenant Status Breakdown + Recent Tenants */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tenant Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Active", count: stats.activeTenants, icon: CheckCircle2, color: "text-green-600" },
                { label: "Trial", count: stats.trialTenants, icon: Clock, color: "text-yellow-600" },
                { label: "Suspended", count: stats.suspendedTenants, icon: XCircle, color: "text-red-600" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
                  <div className="flex items-center gap-3">
                    <item.icon className={`h-5 w-5 ${item.color}`} />
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                  <span className="text-lg font-bold">{item.count}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Recent Tenants</CardTitle>
              <Link
                href="/super-admin/tenants"
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                View all <ExternalLink className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent>
              {stats.recentTenants.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No tenants yet</p>
              ) : (
                <div className="space-y-3">
                  {stats.recentTenants.map((t) => (
                    <div key={t._id.toString()} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{t.name}</p>
                        <p className="text-xs text-muted-foreground">/{t.slug}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={statusVariant(t.status)}>{t.status}</Badge>
                        <Link href={`/super-admin/tenants/${t._id}`}>
                          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Links */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Link
              href="/super-admin/tenants?action=new"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-medium transition-colors"
            >
              <Building2 className="h-4 w-4" />
              Create Tenant
            </Link>
            <Link
              href="/super-admin/tenants"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 text-sm font-medium transition-colors"
            >
              <Building2 className="h-4 w-4" />
              Manage Tenants
            </Link>
            <Link
              href="/super-admin/users"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 text-sm font-medium transition-colors"
            >
              <Users className="h-4 w-4" />
              Manage Users
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
