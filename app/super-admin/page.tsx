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
  UserCheck,
  ArrowRight,
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

  const total = stats.totalTenants || 1;
  const activePct = Math.round((stats.activeTenants / total) * 100);
  const trialPct = Math.round((stats.trialTenants / total) * 100);
  const suspendedPct = 100 - activePct - trialPct;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-30 flex h-16 items-center border-b bg-background px-6">
        <div>
          <h1 className="text-xl font-semibold">Overview</h1>
          <p className="text-sm text-muted-foreground">Welcome back, {session?.user?.name}</p>
        </div>
      </header>

      <div className="flex-1 p-6 space-y-6">

        {/* KPI row */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            title="Total Tenants"
            value={stats.totalTenants}
            description={`${stats.activeTenants} active`}
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
            title="Active Members"
            value={stats.totalMembers.toLocaleString()}
            description="Across all tenants"
            icon={UserCheck}
            iconClassName="bg-yellow-100"
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
            description="All-time"
            icon={DollarSign}
            iconClassName="bg-emerald-100"
          />
        </div>

        {/* Status distribution + Recent tenants */}
        <div className="grid gap-4 lg:grid-cols-2">

          {/* Tenant health */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Tenant Health
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Distribution bar */}
              <div className="flex h-2.5 rounded-full overflow-hidden gap-0.5">
                {activePct > 0 && (
                  <div className="bg-green-500 rounded-l-full" style={{ width: `${activePct}%` }} />
                )}
                {trialPct > 0 && (
                  <div className="bg-yellow-400" style={{ width: `${trialPct}%` }} />
                )}
                {suspendedPct > 0 && (
                  <div className="bg-red-400 rounded-r-full" style={{ width: `${suspendedPct}%` }} />
                )}
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Active", count: stats.activeTenants, pct: activePct, color: "text-green-600", dot: "bg-green-500" },
                  { label: "Trial", count: stats.trialTenants, pct: trialPct, color: "text-yellow-600", dot: "bg-yellow-400" },
                  { label: "Suspended", count: stats.suspendedTenants, pct: suspendedPct, color: "text-red-600", dot: "bg-red-400" },
                ].map((s) => (
                  <div key={s.label} className="flex flex-col gap-1 p-3 rounded-lg bg-muted/40">
                    <div className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                      <span className="text-xs text-muted-foreground">{s.label}</span>
                    </div>
                    <span className={`text-2xl font-bold ${s.color}`}>{s.count}</span>
                    <span className="text-xs text-muted-foreground">{s.pct}%</span>
                  </div>
                ))}
              </div>
              <Link
                href="/super-admin/tenants"
                className="flex items-center justify-between text-sm text-muted-foreground hover:text-foreground pt-1 border-t"
              >
                Manage tenants
                <ArrowRight className="h-4 w-4" />
              </Link>
            </CardContent>
          </Card>

          {/* Recent tenants */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Recent Tenants
              </CardTitle>
              <Link
                href="/super-admin/tenants"
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent>
              {stats.recentTenants.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Building2 className="h-8 w-8 text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">No tenants yet</p>
                  <Link
                    href="/super-admin/tenants?action=new"
                    className="text-xs text-primary hover:underline mt-1"
                  >
                    Create your first tenant
                  </Link>
                </div>
              ) : (
                <div className="divide-y">
                  {stats.recentTenants.map((t) => (
                    <Link
                      key={t._id.toString()}
                      href={`/super-admin/tenants/${t._id}`}
                      className="flex items-center justify-between py-3 hover:opacity-80 transition-opacity"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center">
                          <Building2 className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{t.name}</p>
                          <p className="text-xs text-muted-foreground">
                            /{t.slug} · {new Date(t.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Badge variant={statusVariant(t.status)}>{t.status}</Badge>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
