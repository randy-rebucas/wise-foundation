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
  ShoppingBag,
  Settings,
  ChevronRight,
  Truck,
  Building2,
  Store,
  Percent,
  LayoutGrid,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
  permission?: string;
  roles?: string[];
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard, roles: ["ADMIN"] },
  { label: "Org Dashboard", path: "/org-dashboard", icon: LayoutGrid, roles: ["ORG_ADMIN"] },
  { label: "My Panel", path: "/org-panel", icon: Building2, roles: ["ORG_ADMIN"] },
  { label: "POS", path: "/pos", icon: ShoppingCart, permission: "use:pos" },
  { label: "Products", path: "/products", icon: Package, permission: "manage:products" },
  { label: "Inventory", path: "/inventory", icon: Boxes, permission: "manage:inventory" },
  { label: "Orders", path: "/orders", icon: ClipboardList, permission: "manage:orders" },
  { label: "Purchase Orders", path: "/purchase-orders", icon: Truck, permission: "manage:inventory" },
  { label: "Reseller Sales", path: "/reseller-sales", icon: Store, roles: ["ADMIN", "ORG_ADMIN"] },
  { label: "Commissions", path: "/commissions", icon: Percent, roles: ["ADMIN", "ORG_ADMIN"] },
  { label: "Members", path: "/members", icon: Users, permission: "manage:members" },
  { label: "Reports", path: "/reports", icon: BarChart3, permission: "view:reports" },
];

const ADMIN_ITEMS: NavItem[] = [
  { label: "Branches", path: "/admin/branches", icon: GitBranch, permission: "manage:branches" },
  { label: "Users", path: "/admin/users", icon: Users, roles: ["ADMIN"] },
  { label: "Team", path: "/users", icon: Users, permission: "manage:users", roles: ["ORG_ADMIN"] },
  { label: "Organizations", path: "/admin/organizations", icon: Building2, roles: ["ADMIN"] },
  { label: "Settings", path: "/settings", icon: Settings, roles: ["ADMIN"] },
];

export interface SidebarUser {
  id?: string;
  name?: string | null;
  email?: string | null;
  role: string;
  permissions: string[];
}

interface SidebarProps {
  initialUser: SidebarUser;
  className?: string;
  onNavigate?: () => void;
}

export function Sidebar({ initialUser, className, onNavigate }: SidebarProps) {
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
  const userPermissions = initialUser.permissions;
  const userRole = initialUser.role;

  function canAccess(item: NavItem): boolean {
    if (item.roles) return item.roles.includes(userRole);
    if (!item.permission) return userRole !== "MEMBER";
    return userRole === "ADMIN" || userPermissions.includes(item.permission);
  }

  const initials = displayUser?.name
    ?.split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() ?? "?";

  function NavLink({ item }: { item: NavItem }) {
    const isActive = pathname === item.path || pathname.startsWith(item.path + "/");
    return (
      <Link href={item.path} onClick={() => onNavigate?.()}>
        <span
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
            isActive
              ? "bg-sidebar-primary text-sidebar-primary-foreground"
              : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          )}
        >
          <item.icon className="h-4 w-4 flex-shrink-0" />
          {item.label}
          {isActive && <ChevronRight className="h-3 w-3 ml-auto" />}
        </span>
      </Link>
    );
  }

  return (
    <aside
      className={cn(
        "flex min-h-0 flex-col w-64 max-w-[85vw] bg-sidebar-background text-sidebar-foreground border-r border-sidebar-border",
        className
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
        <div className="p-2 rounded-lg" style={{ background: "hsl(var(--wise-gold))" }}>
          <ShoppingBag className="h-5 w-5" style={{ color: "hsl(var(--wise-navy))" }} />
        </div>
        <div>
          <p className="font-bold text-sm tracking-wide" style={{ color: "hsl(var(--wise-gold))" }}>
            WISE
          </p>
          <p className="text-[10px] text-sidebar-foreground opacity-60 tracking-widest uppercase">
            Women in the Service
          </p>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1 px-3 py-4">
        {/* Main Navigation */}
        <nav className="space-y-1">
          <p className="px-3 py-1 text-xs font-semibold text-sidebar-accent-foreground opacity-50 uppercase tracking-wider">
            Main
          </p>
          {NAV_ITEMS.filter(canAccess).map((item) => (
            <NavLink key={item.path} item={item} />
          ))}
        </nav>

        {/* Admin Navigation */}
        {ADMIN_ITEMS.some(canAccess) && (
          <nav className="space-y-1 mt-6">
            <p className="px-3 py-1 text-xs font-semibold text-sidebar-accent-foreground opacity-50 uppercase tracking-wider">
              Admin
            </p>
            {ADMIN_ITEMS.filter(canAccess).map((item) => (
              <NavLink key={item.path} item={item} />
            ))}
          </nav>
        )}
      </ScrollArea>

      {/* User Footer */}
      <div className="p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs bg-sidebar-primary text-sidebar-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{displayUser?.name}</p>
            <p className="text-xs opacity-60 truncate">{userRole.replace(/_/g, " ")}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={handleSignOut}
            disabled={signingOut}
            title="Sign out"
          >
            <LogOut className={`h-4 w-4 ${signingOut ? "opacity-50" : ""}`} />
          </Button>
        </div>
      </div>
    </aside>
  );
}
