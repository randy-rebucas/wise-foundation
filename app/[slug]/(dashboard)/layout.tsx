import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { getTenantBySlug } from "@/lib/services/tenantFromSlug";
import { Sidebar } from "@/components/layout/Sidebar";
import { TenantProvider } from "@/components/providers/TenantProvider";

// Roles that must not have access to the operator/admin dashboard
const BLOCKED_ROLES = ["MEMBER"];

interface Props {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function SlugDashboardLayout({ children, params }: Props) {
  const { slug } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect(`/login?callbackUrl=/${slug}/dashboard`);
  }

  // Members use a member-facing app — block them from the admin dashboard
  if (BLOCKED_ROLES.includes(session.user.role)) {
    redirect("/login?error=access_denied");
  }

  const tenant = await getTenantBySlug(slug);
  if (!tenant) return notFound();

  // Enforce tenant isolation: user must belong to this tenant (SUPER_ADMIN exempt)
  if (
    session.user.role !== "SUPER_ADMIN" &&
    session.user.tenantId !== tenant._id.toString()
  ) {
    // Redirect to the user's own tenant
    const { Tenant } = await import("@/lib/db/models/Tenant");
    const userTenant = await Tenant.findOne({
      _id: session.user.tenantId,
      deletedAt: null,
    }).lean();
    if (userTenant) {
      redirect(`/${userTenant.slug}/dashboard`);
    }
    redirect("/login");
  }

  const tenantValue = {
    tenantId: tenant._id.toString(),
    slug: tenant.slug,
    tenantName: tenant.name,
    settings: tenant.settings,
  };

  const sidebarUser = {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: session.user.role,
    permissions: session.user.permissions,
  };

  return (
    <TenantProvider value={tenantValue}>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar slug={slug} initialUser={sidebarUser} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </TenantProvider>
  );
}
