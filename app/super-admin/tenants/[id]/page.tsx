import { notFound } from "next/navigation";
import { getTenantDetail } from "@/lib/services/superadmin.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/shared/StatCard";
import { Separator } from "@/components/ui/separator";
import {
  Building2, Users, GitBranch, ShoppingCart, UserCheck, Package,
  ExternalLink, ArrowLeft, Mail, Phone, Globe, MapPin,
  DollarSign, TrendingUp, TrendingDown, ReceiptText, CreditCard, BarChart3,
} from "lucide-react";
import Link from "next/link";
import { TenantDetailActions } from "@/components/super-admin/TenantDetailActions";
import { TenantTransactionsTable } from "@/components/super-admin/TenantTransactionsTable";
import { formatCurrency } from "@/lib/utils";

interface Props {
  params: Promise<{ id: string }>;
}

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const PAYMENT_LABELS: Record<string, string> = {
  cash: "Cash", gcash: "GCash", card: "Card",
  bank_transfer: "Bank Transfer", credit: "Credit",
};

function statusVariant(status: string): "success" | "secondary" | "destructive" {
  if (status === "active") return "success";
  if (status === "suspended") return "destructive";
  return "secondary";
}

function roleVariant(role: string): "default" | "secondary" | "outline" {
  if (role === "TENANT_OWNER") return "default";
  if (role === "BRANCH_MANAGER") return "secondary";
  return "outline";
}

/** Compact currency: ₱1.2M / ₱45K / ₱890 */
function compactCurrency(amount: number, currency = "PHP"): string {
  const symbol = currency === "PHP" ? "₱" : currency;
  if (amount >= 1_000_000) return `${symbol}${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${symbol}${(amount / 1_000).toFixed(1)}K`;
  return `${symbol}${amount.toFixed(0)}`;
}

function SectionHeader({ icon: Icon, title, badge }: {
  icon: React.ElementType;
  title: string;
  badge?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 pb-4 border-b mb-5">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <h2 className="font-semibold text-base">{title}</h2>
      {badge}
    </div>
  );
}

export default async function TenantDetailPage({ params }: Props) {
  const { id } = await params;
  const detail = await getTenantDetail(id);
  if (!detail) return notFound();

  const { tenant, users, branches, orderCount, memberCount, productCount, financials: f } = detail;
  const maxMonthly = Math.max(...f.monthlyRevenue.map((m) => m.total), 1);
  const currency = tenant.settings?.currency ?? "PHP";

  return (
    <div className="flex flex-col min-h-screen">

      {/* ── Sticky header ──────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background px-6">
        <Link
          href="/super-admin/tenants"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Tenants
        </Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="font-semibold truncate">{tenant.name}</h1>
        <Badge variant={statusVariant(tenant.status)} className="capitalize">
          {tenant.status}
        </Badge>
        <div className="ml-auto flex items-center gap-2">
          <a
            href={`/${tenant.slug}/dashboard`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            Open Dashboard
          </a>
          <TenantDetailActions tenantId={id} currentStatus={tenant.status} />
        </div>
      </header>

      <div className="flex-1 p-6 space-y-8">

        {/* ── Quick stats ─────────────────────────────────────────── */}
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard title="Users"    value={users.length}    icon={Users}      iconClassName="bg-purple-100" />
          <StatCard title="Branches" value={branches.length} icon={GitBranch}  iconClassName="bg-blue-100"   />
          <StatCard title="Orders"   value={orderCount}      icon={ShoppingCart} iconClassName="bg-green-100"  />
          <StatCard title="Members"  value={memberCount}     icon={UserCheck}  iconClassName="bg-yellow-100" />
          <StatCard title="Products" value={productCount}    icon={Package}    iconClassName="bg-red-100"    />
        </div>

        {/* ── Tenant info + Branches + Users ──────────────────────── */}
        <div>
          <SectionHeader icon={Building2} title="Tenant Details" />
          <div className="grid gap-4 lg:grid-cols-3">

            {/* Info */}
            <Card>
              <CardContent className="p-5 space-y-3 text-sm">
                {[
                  { icon: Mail, value: tenant.email },
                  tenant.phone ? { icon: Phone, value: tenant.phone } : null,
                  tenant.domain ? { icon: Globe, value: tenant.domain } : null,
                  tenant.address ? { icon: MapPin, value: tenant.address } : null,
                ].filter(Boolean).map((item, i) => {
                  const { icon: Icon, value } = item as { icon: React.ElementType; value: string };
                  return (
                    <div key={i} className="flex items-start gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <span className="break-all">{value}</span>
                    </div>
                  );
                })}
                <Separator />
                <dl className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex justify-between"><dt>Slug</dt><dd className="font-mono">/{tenant.slug}</dd></div>
                  <div className="flex justify-between"><dt>Currency</dt><dd>{currency}</dd></div>
                  <div className="flex justify-between"><dt>Timezone</dt><dd>{tenant.settings?.timezone ?? "Asia/Manila"}</dd></div>
                  <div className="flex justify-between"><dt>Member Discount</dt><dd>{tenant.settings?.memberDiscount ?? 0}%</dd></div>
                  <div className="flex justify-between"><dt>Low Stock Alert</dt><dd>&lt; {tenant.settings?.lowStockThreshold ?? 10} units</dd></div>
                  <div className="flex justify-between"><dt>Created</dt><dd>{new Date(tenant.createdAt).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}</dd></div>
                </dl>
              </CardContent>
            </Card>

            {/* Branches */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground uppercase tracking-wider font-semibold">
                  <GitBranch className="h-3.5 w-3.5" />
                  Branches ({branches.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {branches.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">No branches</p>
                ) : (
                  <div className="space-y-2">
                    {branches.map((b) => (
                      <div key={b._id.toString()} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40">
                        <div>
                          <p className="text-sm font-medium">{b.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{b.code}</p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {b.isHeadOffice && <Badge variant="outline" className="text-xs px-1.5">HQ</Badge>}
                          <Badge variant={b.isActive ? "success" : "secondary"} className="text-xs">
                            {b.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Users */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground uppercase tracking-wider font-semibold">
                  <Users className="h-3.5 w-3.5" />
                  Users ({users.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {users.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">No users</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {users.map((u) => {
                      const initials = u.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();
                      return (
                        <div key={u._id.toString()} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary flex-shrink-0">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{u.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                            </div>
                          </div>
                          <Badge variant={roleVariant(u.role)} className="text-xs whitespace-nowrap flex-shrink-0">
                            {u.role.replace(/_/g, " ")}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ── Financial overview ───────────────────────────────────── */}
        <div>
          <SectionHeader icon={BarChart3} title="Financial Overview" />

          {/* KPIs */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-4">
            <StatCard
              title="Gross Revenue"
              value={formatCurrency(f.grossRevenue)}
              description={`${f.totalOrders} paid orders`}
              icon={DollarSign}
              iconClassName="bg-green-100"
            />
            <StatCard
              title="Net Revenue"
              value={formatCurrency(f.netRevenue)}
              description={`After ${formatCurrency(f.totalRefunds)} refunds`}
              icon={TrendingUp}
              iconClassName="bg-blue-100"
            />
            <StatCard
              title="This Month"
              value={formatCurrency(f.thisMonthRevenue)}
              description={
                f.monthOverMonthChange !== null
                  ? `${f.monthOverMonthChange >= 0 ? "+" : ""}${f.monthOverMonthChange.toFixed(1)}% vs last month`
                  : "No prior month data"
              }
              icon={f.monthOverMonthChange !== null && f.monthOverMonthChange < 0 ? TrendingDown : TrendingUp}
              iconClassName={f.monthOverMonthChange !== null && f.monthOverMonthChange < 0 ? "bg-red-100" : "bg-emerald-100"}
            />
            <StatCard
              title="Avg Order Value"
              value={formatCurrency(f.avgOrderValue)}
              description={`${f.refundCount} refund${f.refundCount !== 1 ? "s" : ""} · ${formatCurrency(f.totalDiscounts)} discounts`}
              icon={ReceiptText}
              iconClassName="bg-purple-100"
            />
          </div>

          {/* Charts row */}
          <div className="grid gap-4 lg:grid-cols-2">

            {/* Monthly bar chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  <BarChart3 className="h-3.5 w-3.5" />
                  Monthly Revenue — Last 6 Months
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                {f.monthlyRevenue.length === 0 ? (
                  <div className="flex items-center justify-center h-28 text-sm text-muted-foreground">
                    No revenue data yet
                  </div>
                ) : (
                  <div className="flex items-end gap-2 h-32 pt-2">
                    {f.monthlyRevenue.map((m) => {
                      const pct = (m.total / maxMonthly) * 100;
                      return (
                        <div
                          key={`${m._id.year}-${m._id.month}`}
                          className="flex-1 flex flex-col items-center gap-1 group"
                          title={`${MONTH_NAMES[m._id.month - 1]} ${m._id.year}: ${formatCurrency(m.total)} · ${m.count} orders`}
                        >
                          {/* Bar */}
                          <div className="w-full bg-muted rounded-t relative" style={{ height: "80px" }}>
                            <div
                              className="absolute bottom-0 w-full bg-primary rounded-t transition-all group-hover:bg-primary/80"
                              style={{ height: `${pct}%` }}
                            />
                          </div>
                          {/* Labels */}
                          <span className="text-[10px] font-medium text-muted-foreground">
                            {MONTH_NAMES[m._id.month - 1]}
                          </span>
                          <span className="text-[10px] text-muted-foreground tabular-nums">
                            {compactCurrency(m.total, currency)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment breakdown */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  <CreditCard className="h-3.5 w-3.5" />
                  Revenue by Payment Method
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-3">
                {f.paymentMethodBreakdown.length === 0 ? (
                  <div className="flex items-center justify-center h-28 text-sm text-muted-foreground">
                    No payment data yet
                  </div>
                ) : (
                  <>
                    {f.paymentMethodBreakdown.map((pm) => {
                      const pct = f.grossRevenue > 0 ? (pm.total / f.grossRevenue) * 100 : 0;
                      return (
                        <div key={pm._id} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">{PAYMENT_LABELS[pm._id] ?? pm._id}</span>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{pm.count} orders</span>
                              <span className="font-semibold text-foreground tabular-nums">
                                {formatCurrency(pm.total)}
                              </span>
                              <span className="w-9 text-right">{pct.toFixed(1)}%</span>
                            </div>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}

                    <Separator className="my-2" />
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Discounts Given</span>
                        <span className="font-medium text-orange-600">−{formatCurrency(f.totalDiscounts)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Refunds</span>
                        <span className="font-medium text-red-600">−{formatCurrency(f.totalRefunds)}</span>
                      </div>
                      <div className="flex justify-between font-semibold text-base pt-1 border-t">
                        <span>Net Revenue</span>
                        <span className="text-green-700">{formatCurrency(f.netRevenue)}</span>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

          </div>
        </div>

        {/* ── Transaction Ledger ───────────────────────────────────── */}
        <div>
          <SectionHeader
            icon={ReceiptText}
            title="Transaction Ledger"
            badge={
              <Badge variant="secondary" className="ml-1">
                {f.totalTransactionCount.toLocaleString()} total
              </Badge>
            }
          />
          <Card>
            <CardContent className="p-4">
              <TenantTransactionsTable tenantId={id} />
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
