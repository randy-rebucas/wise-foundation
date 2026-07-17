"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { AppBrand } from "@/components/branding/AppBrand";
import { AppLogo } from "@/components/branding/AppLogo";
import {
  Bell,
  ChevronRight,
  Menu,
  X,
  CreditCard,
  Gift,
  Heart,
  LayoutDashboard,
  LogOut,
  MapPin,
  PackageCheck,
  Search,
  ShoppingCart,
  Star,
  UserRound,
} from "lucide-react";
import { DEFAULT_PUBLIC_APP_SETTINGS, TenantProvider } from "@/components/providers/TenantProvider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { PublicAppSettings } from "@/lib/types/appSettings";
import { useMarketplaceCartStore } from "@/store/marketplaceCartStore";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types";
import { getStaffHomeLabel, getStaffHomePath } from "@/lib/navigation/staffHome";

/** Roles that may open the operations dashboard from the storefront. */
const MARKETPLACE_DASHBOARD_ROLES: readonly UserRole[] = [
  "ADMIN",
  "ORG_ADMIN",
  "BRANCH_MANAGER",
  "STAFF",
  "INVENTORY_MANAGER",
];

const MARKETPLACE_BACKGROUND_IMAGE = "/227514cb-2277-4b9d-8316-a809e01d41a1.png";

const CUSTOMER_ACCOUNT_ITEMS = [
  {
    label: "My Dashboard",
    description: "Overview & recent activity",
    href: "/account",
    icon: LayoutDashboard,
  },
  {
    label: "My Orders",
    description: "Track, return or buy again",
    href: "/account/orders",
    icon: PackageCheck,
  },
  {
    label: "My Wishlist",
    description: "Saved products",
    href: "/account/wishlist",
    icon: Heart,
  },
  {
    label: "My Addresses",
    description: "Manage delivery addresses",
    href: "/account/addresses",
    icon: MapPin,
  },
  {
    label: "Account Details",
    description: "Edit profile & password",
    href: "/account/details",
    icon: UserRound,
  },
  {
    label: "My Reviews",
    description: "Reviews you've written",
    href: "/account/reviews",
    icon: Star,
  },
  {
    label: "Notifications",
    description: "Messages & updates",
    href: "/account/notifications",
    icon: Bell,
  },
  {
    label: "Rewards & Points",
    description: "Earn points & get rewards",
    href: "/account/rewards",
    icon: Gift,
  },
  {
    label: "Payment Methods",
    description: "Saved cards & wallets",
    href: "/account/payment-methods",
    icon: CreditCard,
  },
];

export function MarketplaceShell({
  tenant,
  children,
}: {
  tenant?: Partial<PublicAppSettings> | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { data: session, status } = useSession();
  const sessionLoading = status === "loading";
  const count = useMarketplaceCartStore((s) => s.getCount());
  const brand = { ...DEFAULT_PUBLIC_APP_SETTINGS, ...(tenant ?? {}) };
  const isHome = pathname === "/";
  const isShop =
    pathname === "/shop" || pathname.startsWith("/product/");
  const hasCustomFooter =
    pathname === "/shop" ||
    pathname === "/categories" ||
    pathname === "/about-us" ||
    pathname === "/reviews" ||
    pathname === "/contact" ||
    pathname === "/cart" ||
    pathname === "/checkout" ||
    pathname.startsWith("/checkout/") ||
    pathname === "/account/register" ||
    pathname === "/account/login" ||
    pathname.startsWith("/account");
  const primaryNav = [
    { href: "/", label: "Home", active: isHome },
    { href: "/shop", label: "Shop", active: isShop },
    { href: "/categories", label: "Categories", active: pathname.startsWith("/categories") },
    { href: "/about-us", label: "About Us", active: pathname.startsWith("/about-us") },
    { href: "/reviews", label: "Reviews", active: pathname.startsWith("/reviews") },
    { href: "/contact", label: "Contact", active: pathname.startsWith("/contact") },
  ];
  const role = session?.user?.role as UserRole | undefined;
  const canOpenDashboard =
    !!role && MARKETPLACE_DASHBOARD_ROLES.includes(role);
  const staffHomeHref =
    session?.user && canOpenDashboard ? getStaffHomePath(session.user) : "/dashboard";
  const staffHomeLabel = role && canOpenDashboard ? getStaffHomeLabel(role) : "Dashboard";
  const displayName = session?.user?.name ?? "Glowish guest";
  const displayEmail = session?.user?.email ?? "Sign in for your account";

  return (
    <TenantProvider value={tenant}>
      <div
        className="flex min-h-screen flex-col bg-[#f6ecff] bg-cover bg-center bg-no-repeat text-[#2A4C6A] max-lg:bg-scroll lg:bg-fixed"
        style={{ backgroundImage: `url(${MARKETPLACE_BACKGROUND_IMAGE})` }}
      >
        <header
          className="sticky top-0 z-50 border-b border-white/40 bg-white/25 backdrop-blur-md"
        >
          <div className="relative mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-2 px-4 py-2 sm:gap-4 sm:px-6">
            <AppBrand
              href="/"
              theme="marketplace"
              appName={brand.appName}
              appTagline={brand.appTagline}
              className="min-w-0 max-w-[calc(100%-7rem)] gap-2 font-semibold sm:max-w-none"
              priority
            />
            <nav className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-1 lg:flex">
              {primaryNav.map((item) => (
                <Button
                  key={item.href}
                  variant={item.active ? "secondary" : "ghost"}
                  size="sm"
                  className={cn(
                    "text-[#1e3157] hover:bg-white/45",
                    item.active && "bg-white/55 text-[#2B6B56]"
                  )}
                  asChild
                >
                  <Link href={item.href}>{item.label}</Link>
                </Button>
              ))}
            </nav>
            <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-full border border-white/45 bg-white/25 lg:hidden"
                onClick={() => setMobileNavOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="h-4 w-4" />
              </Button>
              <Button
                variant={isShop ? "secondary" : "ghost"}
                size="icon"
                className="h-9 w-9 rounded-full border border-white/45 bg-white/25 text-[#1e3157] shadow-sm backdrop-blur hover:bg-white/55"
                asChild
              >
                <Link href="/shop" aria-label="Search products" title="Search products">
                  <Search className="h-4 w-4" />
                </Link>
              </Button>
              {sessionLoading ? (
                <>
                  <Skeleton className="h-9 w-9 rounded-full bg-white/40" />
                  <Skeleton className="h-9 w-9 rounded-full bg-white/40" />
                </>
              ) : (
              <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={
                      pathname.startsWith("/account") || pathname.startsWith("/dashboard")
                        ? "secondary"
                        : "ghost"
                    }
                    size="icon"
                    className="h-9 w-9 rounded-full border border-white/45 bg-white/25 text-[#1e3157] shadow-sm backdrop-blur hover:bg-white/55 data-[state=open]:bg-white/65 data-[state=open]:text-[#2B6B56]"
                    aria-label="Account menu"
                    title="Account"
                  >
                    <UserRound className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  sideOffset={12}
                  className="w-72 rounded-[10px] border-white/60 bg-white/80 p-0 text-[#2A4C6A] shadow-[0_24px_70px_rgba(68,47,107,0.24)] backdrop-blur-xl"
                >
                  <div className="flex items-center gap-3 px-4 py-4">
                    <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-pink-100 to-violet-100 text-[#6ea43f] ring-1 ring-white/70">
                      <UserRound className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#3c2e60]">
                        Hello, {displayName}
                      </p>
                      <p className="truncate text-xs text-[#2A4C6A]/65">{displayEmail}</p>
                    </div>
                  </div>
                  <DropdownMenuSeparator className="mx-4 bg-[#3c2e60]/10" />
                  {session?.user ? (
                    <>
                      <div className="max-h-[26rem] overflow-y-auto p-2">
                        {canOpenDashboard ? (
                          <DropdownMenuItem
                            asChild
                            className="rounded-[10px] px-3 py-3 focus:bg-[#f4e8ff]/80"
                          >
                            <Link href={staffHomeHref} className="flex items-center gap-3">
                              <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-violet-100 text-violet-700">
                                <LayoutDashboard className="h-4 w-4" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block text-sm font-semibold text-[#3c2e60]">
                                  {staffHomeLabel}
                                </span>
                                <span className="block text-xs text-[#2A4C6A]/65">
                                  Open operations dashboard
                                </span>
                              </span>
                              <ChevronRight className="h-4 w-4 text-[#2A4C6A]/45" />
                            </Link>
                          </DropdownMenuItem>
                        ) : (
                          CUSTOMER_ACCOUNT_ITEMS.map((item) => (
                            <DropdownMenuItem
                              key={item.label}
                              asChild
                              className="rounded-[10px] px-3 py-3 focus:bg-[#f4e8ff]/80"
                            >
                              <Link href={item.href} className="flex items-center gap-3">
                                <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-violet-100 text-violet-700">
                                  <item.icon className="h-4 w-4" />
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block text-sm font-semibold text-[#3c2e60]">
                                    {item.label}
                                  </span>
                                  <span className="block text-xs text-[#2A4C6A]/65">
                                    {item.description}
                                  </span>
                                </span>
                                <ChevronRight className="h-4 w-4 text-[#2A4C6A]/45" />
                              </Link>
                            </DropdownMenuItem>
                          ))
                        )}
                      </div>
                      <DropdownMenuSeparator className="mx-4 bg-[#3c2e60]/10" />
                      <div className="p-2">
                        <DropdownMenuItem
                          className="rounded-[10px] px-3 py-3 text-[#3c2e60] focus:bg-[#f4e8ff]/80"
                          onClick={() => void signOut({ callbackUrl: "/" })}
                        >
                          <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-violet-100 text-violet-700">
                            <LogOut className="h-4 w-4" />
                          </span>
                          <span className="ml-3 min-w-0 flex-1">
                            <span className="block text-sm font-semibold">Logout</span>
                            <span className="block text-xs text-[#2A4C6A]/65">
                              Sign out from your account
                            </span>
                          </span>
                        </DropdownMenuItem>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-2 p-3">
                      <DropdownMenuItem asChild className="rounded-[10px] px-3 py-3 focus:bg-[#f4e8ff]/80">
                        <Link href="/account/login" className="flex items-center gap-3">
                          <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-violet-100 text-violet-700">
                            <UserRound className="h-4 w-4" />
                          </span>
                          <span>
                            <span className="block text-sm font-semibold text-[#3c2e60]">
                              Sign in
                            </span>
                            <span className="block text-xs text-[#2A4C6A]/65">
                              Track orders and checkout faster
                            </span>
                          </span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="rounded-[10px] px-3 py-3 focus:bg-[#f4e8ff]/80">
                        <Link href="/account/register" className="flex items-center gap-3">
                          <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-pink-100 text-pink-700">
                            <Heart className="h-4 w-4" />
                          </span>
                          <span>
                            <span className="block text-sm font-semibold text-[#3c2e60]">
                              Create account
                            </span>
                            <span className="block text-xs text-[#2A4C6A]/65">
                              Join the Glowish community
                            </span>
                          </span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="rounded-[10px] px-3 py-3 focus:bg-[#f4e8ff]/80">
                        <Link href="/login" className="flex items-center gap-3">
                          <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-sky-100 text-sky-700">
                            <LayoutDashboard className="h-4 w-4" />
                          </span>
                          <span>
                            <span className="block text-sm font-semibold text-[#3c2e60]">
                              Team login
                            </span>
                            <span className="block text-xs text-[#2A4C6A]/65">
                              Staff and distributor access
                            </span>
                          </span>
                        </Link>
                      </DropdownMenuItem>
                    </div>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant={pathname.startsWith("/cart") ? "secondary" : "ghost"}
                size="icon"
                className="relative h-9 w-9 rounded-full border border-white/45 bg-white/25 text-[#1e3157] shadow-sm backdrop-blur hover:bg-white/55"
                asChild
              >
                <Link href="/cart" aria-label="Cart" title="Cart">
                  <ShoppingCart className="h-4 w-4" />
                  {count > 0 && (
                    <span
                      className={cn(
                        "absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full",
                        "bg-[#6ea43f] px-1 text-[10px] font-bold text-white shadow-sm"
                      )}
                    >
                      {count > 99 ? "99+" : count}
                    </span>
                  )}
                </Link>
              </Button>
              </>
              )}
            </div>
          </div>
        </header>

        {mobileNavOpen && (
          <button
            type="button"
            className="fixed inset-0 z-[60] bg-black/50 lg:hidden"
            aria-label="Close menu"
            onClick={() => setMobileNavOpen(false)}
          />
        )}
        <nav
          className={cn(
            "fixed inset-y-0 left-0 z-[70] flex w-[min(100vw-2rem,18rem)] flex-col gap-1 border-r border-white/50 bg-white/95 p-4 shadow-xl backdrop-blur-xl transition-transform duration-200 lg:hidden",
            mobileNavOpen ? "translate-x-0" : "-translate-x-full pointer-events-none"
          )}
          aria-label="Mobile navigation"
          {...(!mobileNavOpen ? { inert: true } : {})}
        >
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm font-semibold text-[#3c2e60]">Menu</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setMobileNavOpen(false)}
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          {primaryNav.map((item) => (
            <Button
              key={item.href}
              variant={item.active ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start text-[#1e3157]",
                item.active && "bg-white/55 text-[#2B6B56]"
              )}
              asChild
              onClick={() => setMobileNavOpen(false)}
            >
              <Link href={item.href}>{item.label}</Link>
            </Button>
          ))}
        </nav>

        <main
          className={cn(
            "w-full min-w-0 flex-1 py-8",
            isHome ? "" : "mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8"
          )}
        >
          {children}
        </main>
        {/* {!isHome && !hasCustomFooter && (
          <footer className="border-t py-8 text-center text-sm text-muted-foreground">
            <AppLogo size="lg" className="mx-auto mb-3 opacity-90" />
            <p>
              © {new Date().getFullYear()} {brand.appName}. Secure checkout · Local fulfillment.
            </p>
          </footer>
        )} */}
      </div>
    </TenantProvider>
  );
}
