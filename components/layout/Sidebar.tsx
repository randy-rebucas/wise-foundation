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
  Building2,
  GitBranch,
  LogOut,
  ShoppingBag,
  Settings,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
  permission?: string;
  roles?: string[];
}

function buildNavItems(slug: string): NavItem[] {
  const p = (path: string) => `/${slug}${path}`;
  return [
    { label: "Dashboard", path: p("/dashboard"), icon: LayoutDashboard },
    { label: "POS", path: p("/pos"), icon: ShoppingCart, permission: "use:pos" },
    { label: "Products", path: p("/products"), icon: Package, permission: "manage:products" },
    { label: "Inventory", path: p("/inventory"), icon: Boxes, permission: "manage:inventory" },
    { label: "Orders", path: p("/orders"), icon: ClipboardList, permission: "manage:orders" },
    { label: "Members", path: p("/members"), icon: Users, permission: "manage:members" },
    { label: "Reports", path: p("/reports"), icon: BarChart3, permission: "view:reports" },
  ];
}

function buildAdminItems(slug: string): NavItem[] {
  const p = (path: string) => `/${slug}${path}`;
  return [
    { label: "Tenants", path: p("/admin/tenants"), icon: Building2, roles: ["SUPER_ADMIN"] },
    { label: "Branches", path: p("/admin/branches"), icon: GitBranch, permission: "manage:branches" },
    { label: "Users", path: p("/admin/users"), icon: Users, permission: "manage:users" },
    { label: "Settings", path: p("/settings"), icon: Settings, roles: ["SUPER_ADMIN", "TENANT_OWNER"] },
  ];
}

interface SidebarUser {
  id?: string;
  name?: string | null;
  email?: string | null;
  role: string;
  permissions: string[];
}

interface SidebarProps {
  slug: string;
  initialUser: SidebarUser;
}

export function Sidebar({ slug, initialUser }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  // useSession is only needed for sign-out; nav access uses initialUser (server-resolved)
  // to avoid SSR/client hydration mismatches caused by session loading state.
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

  // Prefer live session for display once loaded, but fall back to the server-provided
  // snapshot so the initial render is identical between SSR and hydration.
  const displayUser = session?.user ?? initialUser;
  const userPermissions = initialUser.permissions;
  const userRole = initialUser.role;

  const navItems = buildNavItems(slug);
  const adminItems = buildAdminItems(slug);

  function canAccess(item: NavItem): boolean {
    if (item.roles) return item.roles.includes(userRole);
    if (!item.permission) return true;
    return userRole === "SUPER_ADMIN" || userPermissions.includes(item.permission);
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
      <Link href={item.path}>
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
    <aside className="flex flex-col w-64 min-h-screen bg-sidebar-background text-sidebar-foreground border-r border-sidebar-border">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
        <div className="p-2 bg-sidebar-primary rounded-lg">
          <ShoppingBag className="h-5 w-5 text-sidebar-primary-foreground" />
        </div>
        <div>
          <p className="font-bold text-sm">Livelihood</p>
          <p className="text-xs text-sidebar-accent-foreground opacity-70 truncate max-w-[120px]">
            {slug}
          </p>
        </div>
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        {/* Main Navigation */}
        <nav className="space-y-1">
          <p className="px-3 py-1 text-xs font-semibold text-sidebar-accent-foreground opacity-50 uppercase tracking-wider">
            Main
          </p>
          {navItems.filter(canAccess).map((item) => (
            <NavLink key={item.path} item={item} />
          ))}
        </nav>

        {/* Admin Navigation */}
        {adminItems.some(canAccess) && (
          <nav className="space-y-1 mt-6">
            <p className="px-3 py-1 text-xs font-semibold text-sidebar-accent-foreground opacity-50 uppercase tracking-wider">
              Admin
            </p>
            {adminItems.filter(canAccess).map((item) => (
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
