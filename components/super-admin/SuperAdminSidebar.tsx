"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Building2,
  Users,
  LogOut,
  Shield,
  ChevronRight,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Overview", path: "/super-admin", icon: LayoutDashboard },
  { label: "Tenants", path: "/super-admin/tenants", icon: Building2 },
  { label: "Users", path: "/super-admin/users", icon: Users },
  { label: "Settings", path: "/super-admin/settings", icon: Settings },
];

interface SuperAdminSidebarProps {
  userName?: string | null;
  userEmail?: string | null;
}

export function SuperAdminSidebar({ userName, userEmail }: SuperAdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [signingOut, setSigningOut] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

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

  // Prefer live session once mounted; fall back to server-provided props on first render
  // to keep the server/client HTML identical and avoid hydration mismatches.
  const displayName = (mounted ? session?.user?.name : null) ?? userName;
  const displayEmail = (mounted ? session?.user?.email : null) ?? userEmail;

  const initials = displayName
    ?.split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() ?? "SA";

  function isActive(item: NavItem) {
    if (!mounted) return false;
    if (item.path === "/super-admin") return pathname === "/super-admin";
    return pathname === item.path || pathname.startsWith(item.path + "/");
  }

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-sidebar-background text-sidebar-foreground border-r border-sidebar-border">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
        <div className="p-2 bg-red-600 rounded-lg">
          <Shield className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="font-bold text-sm">Super Admin</p>
          <p className="text-xs text-sidebar-accent-foreground opacity-70">System Control</p>
        </div>
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          <p className="px-3 py-1 text-xs font-semibold text-sidebar-accent-foreground opacity-50 uppercase tracking-wider">
            Management
          </p>
          {NAV_ITEMS.map((item) => {
            const active = isActive(item);
            return (
              <Link key={item.path} href={item.path}>
                <span
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    active
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                  {item.label}
                  {active && <ChevronRight className="h-3 w-3 ml-auto" />}
                </span>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* User Footer */}
      <div className="p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs bg-red-600 text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{displayName}</p>
            <p className="text-xs opacity-60 truncate">{displayEmail}</p>
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
