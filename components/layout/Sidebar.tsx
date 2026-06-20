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
  ChevronDown,
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
  DatabaseBackup,
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

/** A standalone link, or a collapsible group of related links (grouped by usage/purpose). */
type NavEntry = ({ kind: "link" } & NavItem) | { kind: "group"; label: string; icon: React.ElementType; children: NavItem[] };

const NAV_ENTRIES: NavEntry[] = [
  { kind: "link", label: "Dashboard", path: "/dashboard", icon: LayoutDashboard, roles: ["ADMIN"] },
  { kind: "link", label: "Org Dashboard", path: "/org-dashboard", icon: LayoutGrid, roles: ["ORG_ADMIN"] },
  { kind: "link", label: "My Panel", path: "/org-panel", icon: Building2, roles: ["ORG_ADMIN"] },
  {
    kind: "group",
    label: "Products",
    icon: Package,
    children: [
      { label: "Products", path: "/products", icon: Package, permission: "manage:products" },
      { label: "Inventory", path: "/inventory", icon: Boxes, permission: "manage:inventory", requireOrgInventory: true },
      { label: "Media", path: "/media", icon: Images, permission: "manage:products" },
      {
        label: "Purchase Orders",
        path: "/purchase-orders",
        icon: ClipboardList,
        anyPermission: ["manage:inventory", "submit:org_orders"],
      },
    ],
  },
  {
    kind: "group",
    label: "Orders",
    icon: ClipboardList,
    children: [
      { label: "Orders", path: "/orders", icon: ClipboardList, permission: "manage:orders" },
      {
        label: "Abandoned Checkouts",
        path: "/abandoned-checkouts",
        icon: ShoppingCart,
        permission: "manage:orders",
      },
      {
        label: "Deliveries",
        path: "/deliveries",
        icon: Truck,
        anyPermission: ["manage:inventory", "submit:org_orders"],
      },
    ],
  },
  {
    kind: "group",
    label: "Reseller",
    icon: Percent,
    children: [
      { label: "Reseller Sales", path: "/reseller-sales", icon: Store, roles: ["ADMIN", "ORG_ADMIN"] },
      { label: "Commissions", path: "/commissions", icon: Percent, roles: ["ADMIN", "ORG_ADMIN"] },
    ],
  },
  { kind: "link", label: "Members", path: "/members", icon: Users, permission: "manage:members" },
  { kind: "link", label: "Reports", path: "/reports", icon: BarChart3, permission: "view:reports" },
  {
    kind: "group",
    label: "Organization",
    icon: Building2,
    children: [
      { label: "Organizations", path: "/admin/organizations", icon: Building2, roles: ["ADMIN"] },
      { label: "Branches", path: "/admin/branches", icon: GitBranch, permission: "manage:branches" },
      { label: "Users", path: "/admin/users", icon: Users, roles: ["ADMIN"] },
      { label: "Team", path: "/admin/users", icon: Users, permission: "manage:users", roles: ["ORG_ADMIN"] },
    ],
  },
  { kind: "link", label: "Reviews", path: "/admin/reviews", icon: MessageSquare, roles: ["ADMIN"] },
  { kind: "link", label: "Backup & Restore", path: "/admin/backup", icon: DatabaseBackup, roles: ["ADMIN"] },
  { kind: "link", label: "Help & guides", path: "/help", icon: BookOpen, allAuthenticated: true },
  { kind: "link", label: "Settings", path: "/settings", icon: Settings },
];

const SALES_CHANNEL_ENTRIES: NavEntry[] = [
  { kind: "link", label: "Online store", path: "/", icon: Globe2, allAuthenticated: true },
  { kind: "link", label: "POS", path: "/pos", icon: ShoppingCart, permission: "use:pos", requireOrgPos: true },
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
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  function toggleGroup(label: string) {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  }

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
    role: displayUser.role ?? initialUser.role,
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

  function isItemActive(item: NavItem) {
    return (
      pathname === item.path ||
      (item.path !== "/" && pathname.startsWith(item.path + "/"))
    );
  }

  function NavLink({ item, indent = false }: { item: NavItem; indent?: boolean }) {
    const isActive = isItemActive(item);
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
            indent && !collapsed && "pl-9",
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

  function NavGroup({ entry }: { entry: Extract<NavEntry, { kind: "group" }> }) {
    const children = entry.children.filter(canAccess);
    if (children.length === 0) return null;
    const hasActiveChild = children.some(isItemActive);
    const isOpen = openGroups[entry.label] ?? hasActiveChild;
    const primaryPath = children[0].path;
    const submenuChildren = children.slice(1);

    if (collapsed) {
      return (
        <>
          {children.map((item) => (
            <NavLink key={`${item.path}-${item.label}`} item={item} />
          ))}
        </>
      );
    }

    return (
      <div>
        <div
          className={cn(
            "flex items-center rounded-lg text-sm font-medium transition-colors",
            hasActiveChild
              ? "bg-sidebar-primary text-sidebar-primary-foreground"
              : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          )}
        >
          <Link
            href={primaryPath}
            onClick={() => {
              setOpenGroups((prev) => ({ ...prev, [entry.label]: true }));
              onNavigate?.();
            }}
            className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2"
          >
            <entry.icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{entry.label}</span>
          </Link>
          {submenuChildren.length > 0 && (
            <button
              type="button"
              onClick={() => toggleGroup(entry.label)}
              aria-label={isOpen ? `Collapse ${entry.label}` : `Expand ${entry.label}`}
              className="flex shrink-0 items-center px-3 py-2"
            >
              <ChevronDown
                className={cn("h-3.5 w-3.5 shrink-0 transition-transform", !isOpen && "-rotate-90")}
              />
            </button>
          )}
        </div>
        {isOpen && submenuChildren.length > 0 && (
          <div className="mt-1 space-y-1">
            {submenuChildren.map((item) => (
              <NavLink key={`${item.path}-${item.label}`} item={item} indent />
            ))}
          </div>
        )}
      </div>
    );
  }

  function NavEntries({ entries }: { entries: NavEntry[] }) {
    return (
      <>
        {entries.map((entry) =>
          entry.kind === "group" ? (
            <NavGroup key={entry.label} entry={entry} />
          ) : canAccess(entry) ? (
            <NavLink key={`${entry.path}-${entry.label}`} item={entry} />
          ) : null
        )}
      </>
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
          <NavEntries entries={NAV_ENTRIES} />
        </nav>

        {SALES_CHANNEL_ENTRIES.some((entry) =>
          entry.kind === "group" ? entry.children.some(canAccess) : canAccess(entry)
        ) && (
          <nav className="mt-6 space-y-1">
            <p
              className={cn(
                "px-3 py-1 text-xs font-semibold uppercase tracking-wider text-sidebar-accent-foreground opacity-50",
                collapsed && "md:sr-only"
              )}
            >
              Sales Channel
            </p>
            <NavEntries entries={SALES_CHANNEL_ENTRIES} />
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
            <p className="truncate text-xs opacity-60">{accessUser.role?.replace(/_/g, " ")}</p>
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
