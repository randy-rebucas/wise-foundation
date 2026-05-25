"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useSession } from "next-auth/react";
import { useState } from "react";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Boxes,
  Users,
  ClipboardList,
  BarChart3,
  GitBranch,
  LogOut,
  Settings,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
  Truck,
  Building2,
  Store,
  Percent,
  LayoutGrid,
  Globe2,
  BookOpen,
  Images,
  MessageSquare,
} from "lucide-react";
import { hasPermission } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { AppBrand } from "@/components/branding/AppBrand";
import { useTenant } from "@/components/providers/TenantProvider";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
  permission?: string;
  /** User needs any one of these permissions (platform admin always passes). */
  anyPermission?: string[];
  roles?: string[];
  /** Never show for these roles (checked before roles/permissions). */
  excludeRoles?: string[];
  /** Hide for users tied to an organization (distributors, franchises, partners). */
  hideForOrgUsers?: boolean;
  /** Org-bound user must have POS enabled for their organization type. */
  requireOrgPos?: boolean;
  /** Org-bound user must have inventory enabled (any surface). */
  requireOrgInventory?: boolean;
  /** When true, any authenticated dashboard user may see this link (still requires dashboard access). */
  allAuthenticated?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard, roles: ["ADMIN"] },
  { label: "Org Dashboard", path: "/org-dashboard", icon: LayoutGrid, roles: ["ORG_ADMIN"] },
  { label: "My Panel", path: "/org-panel", icon: Building2, roles: ["ORG_ADMIN"] },
  { label: "Online store", path: "/", icon: Globe2, allAuthenticated: true },
  { label: "POS", path: "/pos", icon: ShoppingCart, permission: "use:pos", requireOrgPos: true },
  { label: "Products", path: "/products", icon: Package, permission: "manage:products" },
  { label: "Media", path: "/media", icon: Images, permission: "manage:products" },
  {
    label: "Inventory",
    path: "/inventory",
    icon: Boxes,
    permission: "manage:inventory",
    requireOrgInventory: true,
  },
  { label: "Orders", path: "/orders", icon: ClipboardList, permission: "manage:orders" },
  {
    label: "Purchase Orders",
    path: "/purchase-orders",
    icon: Package,
    anyPermission: ["manage:inventory", "submit:org_orders"],
  },
  {
    label: "Deliveries",
    path: "/deliveries",
    icon: Truck,
    roles: ["ADMIN"],
    excludeRoles: ["ORG_ADMIN"],
    hideForOrgUsers: true,
  },
  { label: "Reseller Sales", path: "/reseller-sales", icon: Store, roles: ["ADMIN", "ORG_ADMIN"] },
  { label: "Commissions", path: "/commissions", icon: Percent, roles: ["ADMIN", "ORG_ADMIN"] },
  { label: "Members", path: "/members", icon: Users, permission: "manage:members" },
  { label: "Reports", path: "/reports", icon: BarChart3, permission: "view:reports" },
  { label: "Help & guides", path: "/help", icon: BookOpen, allAuthenticated: true },
  { label: "Settings", path: "/settings", icon: Settings },
];

const ADMIN_ITEMS: NavItem[] = [
  { label: "Branches", path: "/admin/branches", icon: GitBranch, permission: "manage:branches" },
  { label: "Users", path: "/admin/users", icon: Users, roles: ["ADMIN"] },
  { label: "Team", path: "/admin/users", icon: Users, permission: "manage:users", roles: ["ORG_ADMIN"] },
  { label: "Organizations", path: "/admin/organizations", icon: Building2, roles: ["ADMIN"] },
  { label: "Reviews", path: "/admin/reviews", icon: MessageSquare, roles: ["ADMIN"] },
];

export interface SidebarUser {
  id?: string;
  name?: string | null;
  email?: string | null;
  role: string;
  permissions: string[];
  organizationId?: string | null;
  organizationCapabilities?: {
    inventorySurface: "branch" | "organization" | "none";
    posSurface: "branch" | "none";
  } | null;
}

const SIDEBAR_COLLAPSED_KEY = "dashboard-sidebar-collapsed";

interface SidebarProps {
  initialUser: SidebarUser;
  className?: string;
  onNavigate?: () => void;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}

export function Sidebar({
  initialUser,
  className,
  onNavigate,
  collapsed = false,
  onToggleCollapsed,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut({ redirect: false });
      router.push("/login");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

  const displayUser = session?.user ?? initialUser;
  const orgCapabilities =
    "organizationCapabilities" in displayUser
      ? (displayUser.organizationCapabilities ?? null)
      : (initialUser.organizationCapabilities ?? null);

  const accessUser = {
    role: displayUser.role,
    permissions: displayUser.permissions ?? [],
    organizationId:
      "organizationId" in displayUser
        ? (displayUser.organizationId ?? null)
        : (initialUser.organizationId ?? null),
    organizationCapabilities: orgCapabilities,
  };

  function canAccess(item: NavItem): boolean {
    if (item.allAuthenticated) return true;
    if (item.excludeRoles?.includes(accessUser.role)) return false;
    if (item.hideForOrgUsers && accessUser.organizationId) return false;
    if (item.requireOrgPos && accessUser.organizationId) {
      if (accessUser.organizationCapabilities?.posSurface !== "branch") return false;
    }
    if (item.requireOrgInventory && accessUser.organizationId) {
      if (accessUser.organizationCapabilities?.inventorySurface === "none") return false;
    }
    if (item.roles) {
      return item.roles.includes(accessUser.role);
    }
    if (item.anyPermission?.length) {
      return item.anyPermission.some((p) => hasPermission(accessUser, p));
    }
    if (!item.permission) return accessUser.role !== "MEMBER";
    return hasPermission(accessUser, item.permission);
  }

  const initials = displayUser?.name
    ?.split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() ?? "?";

  function NavLink({ item }: { item: NavItem }) {
    const isActive =
      pathname === item.path ||
      (item.path !== "/" && pathname.startsWith(item.path + "/"));
    return (
      <Link
        href={item.path}
        onClick={() => onNavigate?.()}
        title={collapsed ? item.label : undefined}
      >
        <span
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            collapsed && "md:justify-center md:gap-0 md:px-2",
            isActive
              ? "bg-sidebar-primary text-sidebar-primary-foreground"
              : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          )}
        >
          <item.icon className="h-4 w-4 shrink-0" />
          <span className={cn("truncate", collapsed && "md:sr-only")}>{item.label}</span>
          {isActive && !collapsed && <ChevronRight className="ml-auto h-3 w-3 shrink-0" />}
        </span>
      </Link>
    );
  }

  return (
    <aside
      aria-expanded={!collapsed}
      className={cn(
        "flex min-h-0 w-64 max-w-[85vw] flex-col border-r border-sidebar-border bg-sidebar-background text-sidebar-foreground transition-[width] duration-200 ease-out",
        collapsed && "md:w-[4.5rem] md:max-w-[4.5rem]",
        className
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2 border-b border-sidebar-border py-4",
          collapsed ? "px-4 md:flex-col md:gap-3 md:px-2" : "px-4 sm:px-6"
        )}
      >
        <AppBrand
          theme="sidebar"
          priority
          className={cn("min-w-0 flex-1", collapsed && "md:flex-none md:justify-center")}
        />
        {onToggleCollapsed ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="hidden h-8 w-8 shrink-0 text-sidebar-foreground hover:bg-sidebar-accent md:inline-flex"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
        ) : null}
      </div>

      <ScrollArea className="min-h-0 flex-1 px-3 py-4">
        <nav className="space-y-1">
          <p
            className={cn(
              "px-3 py-1 text-xs font-semibold uppercase tracking-wider text-sidebar-accent-foreground opacity-50",
              collapsed && "md:sr-only"
            )}
          >
            Main
          </p>
          {NAV_ITEMS.filter(canAccess).map((item) => (
            <NavLink key={`${item.path}-${item.label}`} item={item} />
          ))}
        </nav>

        {ADMIN_ITEMS.some(canAccess) && (
          <nav className="mt-6 space-y-1">
            <p
              className={cn(
                "px-3 py-1 text-xs font-semibold uppercase tracking-wider text-sidebar-accent-foreground opacity-50",
                collapsed && "md:sr-only"
              )}
            >
              Admin
            </p>
            {ADMIN_ITEMS.filter(canAccess).map((item) => (
              <NavLink key={`${item.path}-${item.label}`} item={item} />
            ))}
          </nav>
        )}
      </ScrollArea>

      <div className="border-t border-sidebar-border p-3">
        <div
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2",
            collapsed && "md:flex-col md:gap-2 md:px-1"
          )}
        >
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="bg-sidebar-primary text-xs text-sidebar-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className={cn("min-w-0 flex-1", collapsed && "md:sr-only")}>
            <p className="truncate text-sm font-medium">{displayUser?.name}</p>
            <p className="truncate text-xs opacity-60">{accessUser.role.replace(/_/g, " ")}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8 shrink-0 text-sidebar-foreground hover:bg-sidebar-accent",
              collapsed && "md:w-full"
            )}
            onClick={handleSignOut}
            disabled={signingOut}
            title="Sign out"
          >
            <LogOut className={cn("h-4 w-4", signingOut && "opacity-50")} />
          </Button>
        </div>
      </div>
    </aside>
  );
}

export { SIDEBAR_COLLAPSED_KEY };
