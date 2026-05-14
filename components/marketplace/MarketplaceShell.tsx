"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, Store } from "lucide-react";
import { DEFAULT_PUBLIC_APP_SETTINGS, TenantProvider } from "@/components/providers/TenantProvider";
import { Button } from "@/components/ui/button";
import type { PublicAppSettings } from "@/lib/types/appSettings";
import { useMarketplaceCartStore } from "@/store/marketplaceCartStore";
import { cn } from "@/lib/utils";

export function MarketplaceShell({
  tenant,
  children,
}: {
  tenant?: Partial<PublicAppSettings> | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const count = useMarketplaceCartStore((s) => s.getCount());
  const brand = { ...DEFAULT_PUBLIC_APP_SETTINGS, ...(tenant ?? {}) };
  const isShop =
    pathname === "/" || pathname.startsWith("/product/");

  return (
    <TenantProvider value={tenant}>
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <header className="sticky top-0 z-50 border-b bg-background/90 backdrop-blur-md">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Store className="h-5 w-5" />
              </div>
              <span className="hidden sm:inline">{brand.appName}</span>
              <span className="text-muted-foreground text-xs font-normal hidden md:inline truncate max-w-[200px]">
                {brand.appTagline}
              </span>
            </Link>
            <nav className="flex items-center gap-1 sm:gap-2">
              <Button variant={isShop ? "secondary" : "ghost"} size="sm" asChild>
                <Link href="/">Shop</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Sign in</Link>
              </Button>
              <Button variant="outline" size="sm" className="relative gap-1.5" asChild>
                <Link href="/cart">
                  <ShoppingBag className="h-4 w-4" />
                  Cart
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
