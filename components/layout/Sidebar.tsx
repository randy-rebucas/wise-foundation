"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useSession } from "next-auth/react";
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
  href: string;
  icon: React.ElementType;
  permission?: string;
  roles?: string[];
  badge?: string;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "POS", href: "/pos", icon: ShoppingCart, permission: "use:pos" },
  { label: "Products", href: "/products", icon: Package, permission: "manage:products" },
  { label: "Inventory", href: "/inventory", icon: Boxes, permission: "manage:inventory" },
  { label: "Orders", href: "/orders", icon: ClipboardList, permission: "manage:orders" },
  { label: "Members", href: "/members", icon: Users, permission: "manage:members" },
  { label: "Reports", href: "/reports", icon: BarChart3, permission: "view:reports" },
];

const adminItems: NavItem[] = [
  { label: "Tenants", href: "/admin/tenants", icon: Building2, roles: ["SUPER_ADMIN"] },
  { label: "Branches", href: "/admin/branches", icon: GitBranch, permission: "manage:branches" },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user;

  const userPermissions = user?.permissions ?? [];
  const userRole = user?.role ?? "";

  function canAccess(item: NavItem): boolean {
    if (item.roles) return item.roles.includes(userRole);
    if (!item.permission) return true;
    return userRole === "SUPER_ADMIN" || userPermissions.includes(item.permission);
  }

  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() ?? "?";

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-sidebar-background text-sidebar-foreground border-r border-sidebar-border">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
        <div className="p-2 bg-sidebar-primary rounded-lg">
          <ShoppingBag className="h-5 w-5 text-sidebar-primary-foreground" />
        </div>
        <div>
          <p className="font-bold text-sm">Livelihood</p>
          <p className="text-xs text-sidebar-accent-foreground opacity-70">Platform</p>
        </div>
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        {/* Main Navigation */}
        <nav className="space-y-1">
          <p className="px-3 py-1 text-xs font-semibold text-sidebar-accent-foreground opacity-50 uppercase tracking-wider">
            Main
          </p>
          {navItems.filter(canAccess).map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link key={item.href} href={item.href}>
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
                  {item.badge && (
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {item.badge}
                    </Badge>
                  )}
                  {isActive && <ChevronRight className="h-3 w-3 ml-auto" />}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Admin Navigation */}
        {adminItems.some(canAccess) && (
          <nav className="space-y-1 mt-6">
            <p className="px-3 py-1 text-xs font-semibold text-sidebar-accent-foreground opacity-50 uppercase tracking-wider">
              Admin
            </p>
            {adminItems.filter(canAccess).map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link key={item.href} href={item.href}>
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
                  </span>
                </Link>
              );
            })}
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
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs opacity-60 truncate">{user?.role?.replace(/_/g, " ")}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
