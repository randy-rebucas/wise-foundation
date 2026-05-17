"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { AppBrand } from "@/components/branding/AppBrand";
import { AppLogo } from "@/components/branding/AppLogo";
import {
  Bell,
  ChevronRight,
  CreditCard,
  Gift,
  Heart,
  LayoutDashboard,
  LogOut,
  MapPin,
  PackageCheck,
  Search,
  ShoppingBag,
  Star,
  UserRound,
} from "lucide-react";
import { DEFAULT_PUBLIC_APP_SETTINGS, TenantProvider } from "@/components/providers/TenantProvider";
import { Button } from "@/components/ui/button";
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
    href: "/account",
    icon: PackageCheck,
  },
  {
    label: "My Wishlist",
    description: "Saved products",
    href: "/account",
    icon: Heart,
  },
  {
    label: "My Addresses",
    description: "Manage delivery addresses",
    href: "/account",
    icon: MapPin,
  },
  {
    label: "Account Details",
    description: "Edit profile & password",
    href: "/account",
    icon: UserRound,
  },
  {
    label: "My Reviews",
    description: "Reviews you've written",
    href: "/reviews",
    icon: Star,
  },
  {
    label: "Notifications",
    description: "Messages & updates",
    href: "/account",
    icon: Bell,
  },
  {
    label: "Rewards & Points",
    description: "Earn points & get rewards",
    href: "/account",
    icon: Gift,
  },
  {
    label: "Payment Methods",
    description: "Saved cards & wallets",
    href: "/account",
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
  const { data: session } = useSession();
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
    pathname === "/contact";
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
  const displayName = session?.user?.name ?? "Glowish guest";
  const displayEmail = session?.user?.email ?? "Sign in for your account";

  return (
    <TenantProvider value={tenant}>
      <div
        className="flex min-h-screen flex-col bg-[#f6ecff] bg-cover bg-fixed bg-center bg-no-repeat text-[#2A4C6A]"
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
              className="gap-2 font-semibold"
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
                variant={isShop ? "secondary" : "ghost"}
                size="icon"
                className="h-9 w-9 rounded-full border border-white/45 bg-white/25 text-[#1e3157] shadow-sm backdrop-blur hover:bg-white/55"
                asChild
              >
                <Link href="/shop" aria-label="Search products" title="Search products">
                  <Search className="h-4 w-4" />
                </Link>
              </Button>
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
                  className="w-72 rounded-3xl border-white/60 bg-white/80 p-0 text-[#2A4C6A] shadow-[0_24px_70px_rgba(68,47,107,0.24)] backdrop-blur-xl"
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
                            className="rounded-2xl px-3 py-3 focus:bg-[#f4e8ff]/80"
                          >
                            <Link href="/dashboard" className="flex items-center gap-3">
                              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                                <LayoutDashboard className="h-4 w-4" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block text-sm font-semibold text-[#3c2e60]">
                                  Dashboard
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
                              className="rounded-2xl px-3 py-3 focus:bg-[#f4e8ff]/80"
                            >
                              <Link href={item.href} className="flex items-center gap-3">
                                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
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
                          className="rounded-2xl px-3 py-3 text-[#3c2e60] focus:bg-[#f4e8ff]/80"
                          onClick={() => void signOut({ callbackUrl: "/" })}
                        >
                          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
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
                      <DropdownMenuItem asChild className="rounded-2xl px-3 py-3 focus:bg-[#f4e8ff]/80">
                        <Link href="/account/login" className="flex items-center gap-3">
                          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
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
                      <DropdownMenuItem asChild className="rounded-2xl px-3 py-3 focus:bg-[#f4e8ff]/80">
                        <Link href="/account/register" className="flex items-center gap-3">
                          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-pink-100 text-pink-700">
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
                      <DropdownMenuItem asChild className="rounded-2xl px-3 py-3 focus:bg-[#f4e8ff]/80">
                        <Link href="/login" className="flex items-center gap-3">
                          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
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
                  <ShoppingBag className="h-4 w-4" />
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
            </div>
          </div>
        </header>
        <main className={cn("w-full flex-1", isHome ? "" : "mx-auto max-w-6xl px-4 py-8")}>
          {children}
        </main>
        {!isHome && !hasCustomFooter && (
          <footer className="border-t py-8 text-center text-sm text-muted-foreground">
            <AppLogo size="lg" className="mx-auto mb-3 opacity-90" />
            <p>
              © {new Date().getFullYear()} {brand.appName}. Secure checkout · Local fulfillment.
            </p>
          </footer>
        )}
      </div>
    </TenantProvider>
  );
}
