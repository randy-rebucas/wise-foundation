import { notFound } from "next/navigation";
import { getTenantDetail } from "@/lib/services/superadmin.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/shared/StatCard";
import {
  Building2,
  Users,
  GitBranch,
  ShoppingCart,
  UserCheck,
  Package,
  ExternalLink,
  ArrowLeft,
  Mail,
  Phone,
  Globe,
  MapPin,
} from "lucide-react";
import Link from "next/link";
import { TenantDetailActions } from "@/components/super-admin/TenantDetailActions";

interface Props {
  params: Promise<{ id: string }>;
}

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

export default async function TenantDetailPage({ params }: Props) {
  const { id } = await params;
  const detail = await getTenantDetail(id);
  if (!detail) return notFound();

  const { tenant, users, branches, orderCount, memberCount, productCount } = detail;

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-6">
        <Link
          href="/super-admin/tenants"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Tenants
        </Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-xl font-semibold">{tenant.name}</h1>
        <Badge variant={statusVariant(tenant.status)} className="ml-1">
          {tenant.status}
        </Badge>
        <div className="ml-auto flex items-center gap-2">
          <a
            href={`/${tenant.slug}/dashboard`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="h-4 w-4" />
            Open Dashboard
          </a>
          <TenantDetailActions tenantId={id} currentStatus={tenant.status} />
        </div>
      </header>

      <div className="flex-1 p-6 space-y-6">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <StatCard title="Users" value={users.length} icon={Users} iconClassName="bg-purple-100" />
          <StatCard title="Branches" value={branches.length} icon={GitBranch} iconClassName="bg-blue-100" />
          <StatCard title="Orders" value={orderCount} icon={ShoppingCart} iconClassName="bg-green-100" />
          <StatCard title="Members" value={memberCount} icon={UserCheck} iconClassName="bg-yellow-100" />
          <StatCard title="Products" value={productCount} icon={Package} iconClassName="bg-red-100" />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {/* Tenant Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-4 w-4" />
                Tenant Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                <span>{tenant.email}</span>
              </div>
              {tenant.phone && (
                <div className="flex items-start gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span>{tenant.phone}</span>
                </div>
              )}
              {tenant.domain && (
                <div className="flex items-start gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span>{tenant.domain}</span>
                </div>
              )}
              {tenant.address && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span>{tenant.address}</span>
                </div>
              )}
              <div className="pt-2 border-t space-y-1 text-xs text-muted-foreground">
                <p>Slug: <span className="font-mono">/{tenant.slug}</span></p>
                <p>Currency: {tenant.settings?.currency ?? "PHP"}</p>
                <p>Timezone: {tenant.settings?.timezone ?? "Asia/Manila"}</p>
                <p>Member Discount: {tenant.settings?.memberDiscount ?? 0}%</p>
                <p>Low Stock Threshold: {tenant.settings?.lowStockThreshold ?? 10}</p>
                <p>
                  Created: {new Date(tenant.createdAt).toLocaleDateString()}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Branches */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <GitBranch className="h-4 w-4" />
                Branches
              </CardTitle>
            </CardHeader>
            <CardContent>
              {branches.length === 0 ? (
                <p className="text-sm text-muted-foreground">No branches</p>
              ) : (
                <div className="space-y-2">
                  {branches.map((b) => (
                    <div key={b._id.toString()} className="flex items-center justify-between p-2 rounded-lg bg-muted/40">
                      <div>
                        <p className="text-sm font-medium">{b.name}</p>
                        <p className="text-xs text-muted-foreground">{b.code}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {b.isHeadOffice && (
                          <Badge variant="outline" className="text-xs">HQ</Badge>
                        )}
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
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" />
                Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              {users.length === 0 ? (
                <p className="text-sm text-muted-foreground">No users</p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {users.map((u) => {
                    const initials = u.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();
                    return (
                      <div key={u._id.toString()} className="flex items-center justify-between p-2 rounded-lg bg-muted/40">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                            {initials}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{u.name}</p>
                            <p className="text-xs text-muted-foreground">{u.email}</p>
                          </div>
                        </div>
                        <Badge variant={roleVariant(u.role)} className="text-xs">
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
    </div>
  );
}
