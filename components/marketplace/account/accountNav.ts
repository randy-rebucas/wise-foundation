import type { LucideIcon } from "lucide-react";
import {
  Bell,
  CreditCard,
  Gift,
  Heart,
  LayoutDashboard,
  MapPin,
  Package,
  Star,
  UserRound,
} from "lucide-react";

export type AccountNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const ACCOUNT_NAV: AccountNavItem[] = [
  { label: "My Dashboard", href: "/account", icon: LayoutDashboard },
  { label: "My Orders", href: "/account/orders", icon: Package },
  { label: "My Wishlist", href: "/account/wishlist", icon: Heart },
  { label: "My Addresses", href: "/account/addresses", icon: MapPin },
  { label: "Account Details", href: "/account/details", icon: UserRound },
  { label: "My Reviews", href: "/account/reviews", icon: Star },
  { label: "Notifications", href: "/account/notifications", icon: Bell },
  { label: "Rewards & Points", href: "/account/rewards", icon: Gift },
  { label: "Payment Methods", href: "/account/payment-methods", icon: CreditCard },
];

export function isAccountNavActive(pathname: string, href: string) {
  if (href === "/account") return pathname === "/account";
  return pathname === href || pathname.startsWith(`${href}/`);
}
