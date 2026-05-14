"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { ShoppingBag, Store } from "lucide-react";
import { DEFAULT_PUBLIC_APP_SETTINGS, TenantProvider } from "@/components/providers/TenantProvider";
import { Button } from "@/components/ui/button";
import type { PublicAppSettings } from "@/lib/types/appSettings";
import { useMarketplaceCartStore } from "@/store/marketplaceCartStore";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types";

/** Roles that may open the operations dashboard from the storefront. */
const MARKETPLACE_DASHBOARD_ROLES: readonly UserRole[] = [
  "ADMIN",
  "ORG_ADMIN",
  "BRANCH_MANAGER",
  "STAFF",
  "INVENTORY_MANAGER",
];

export function MarketplaceShell({
  tenant,
  children,
}: {
  tenant?: Partial<PublicAppSettings> | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const count = useMarketplaceCartStore((s) => s.getCount());
  const brand = { ...DEFAULT_PUBLIC_APP_SETTINGS, ...(tenant ?? {}) };
  const isShop =
    pathname === "/" || pathname.startsWith("/product/");
  const role = session?.user?.role as UserRole | undefined;
  const isCustomer = role === "CUSTOMER";
  const canOpenDashboard =
    !!role && MARKETPLACE_DASHBOARD_ROLES.includes(role);
  const isSignedInNonStaff = !!session?.user && !isCustomer && !canOpenDashboard;

  return (
    <TenantProvider value={tenant}>
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <header className="sticky top-0 z-50 border-b bg-background/90 backdrop-blur-md">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4 sm:gap-4">
            <Link href="/" className="flex min-w-0 items-center gap-2 font-semibold tracking-tight">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Store className="h-5 w-5" />
              </div>
              <span className="hidden sm:inline truncate">{brand.appName}</span>
              <span className="text-muted-foreground text-xs font-normal hidden md:inline truncate max-w-[200px]">
                {brand.appTagline}
              </span>
            </Link>
            <nav className="flex shrink-0 flex-wrap items-center justify-end gap-1 sm:gap-2">
              <Button variant={isShop ? "secondary" : "ghost"} size="sm" asChild>
                <Link href="/">Shop</Link>
              </Button>
              {isCustomer ? (
                <>
                  <Button variant={pathname.startsWith("/account") ? "secondary" : "ghost"} size="sm" asChild>
                    <Link href="/account">Account</Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => void signOut({ callbackUrl: "/" })}
                  >
                    Sign out
                  </Button>
                </>
              ) : canOpenDashboard ? (
                <>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/dashboard">Dashboard</Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => void signOut({ callbackUrl: "/" })}
                  >
                    Sign out
                  </Button>
                </>
              ) : isSignedInNonStaff ? (
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => void signOut({ callbackUrl: "/" })}
                >
                  Sign out
                </Button>
              ) : (
                <>
                  <Button variant="ghost" size="sm" className="hidden sm:inline-flex" asChild>
                    <Link href="/account/register">Register</Link>
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/account/login">Sign in</Link>
                  </Button>
                  <Button variant="ghost" size="sm" className="hidden text-xs text-muted-foreground md:inline-flex px-2" asChild>
                    <Link href="/login">Team login</Link>
                  </Button>
                </>
              )}
              <Button variant="outline" size="sm" className="relative gap-1.5" asChild>
                <Link href="/cart">
                  <ShoppingBag className="h-4 w-4" />
                  <span className="hidden sm:inline">Cart</span>
                  {count > 0 && (
                    <span
                      className={cn(
                        "absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full",
                        "bg-primary px-1 text-[10px] font-bold text-primary-foreground"
                      )}
                    >
                      {count > 99 ? "99+" : count}
                    </span>
                  )}
                </Link>
              </Button>
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
        <footer className="border-t py-8 text-center text-sm text-muted-foreground">
          <p>
            © {new Date().getFullYear()} {brand.appName}. Secure checkout · Local fulfillment.
          </p>
        </footer>
      </div>
    </TenantProvider>
  );
}
