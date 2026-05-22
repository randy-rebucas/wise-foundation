import type { ElementType } from "react";
import { Heart, Home, Leaf, Sparkles } from "lucide-react";
import { PRODUCT_CATEGORIES } from "@/lib/products/catalog";
import type { ProductCategory } from "@/types";

export type MarketplaceCategoryCardConfig = {
  value: ProductCategory;
  label: string;
  description: string;
  icon: ElementType;
  accent: string;
  chip: string;
  /** Tailwind classes for home page category button gradient */
  homeColor: string;
  href: string;
};

/** Storefront category cards — labels match dashboard `PRODUCT_CATEGORIES`. */
export const MARKETPLACE_CATEGORY_CARDS: MarketplaceCategoryCardConfig[] = [
  {
    value: "homecare",
    label: "Home Care",
    description: "Household and daily care essentials for a clean, comfortable home.",
    icon: Home,
    href: "/shop?category=homecare",
    accent: "from-sky-100/90 via-white/40 to-blue-50/80",
    chip: "bg-blue-100 text-blue-700",
    homeColor: "from-sky-200/80 to-blue-100/70 text-sky-700",
  },
  {
    value: "cosmetics",
    label: "Cosmetics",
    description: "Skincare, beauty, and self-care products for your daily glow ritual.",
    icon: Sparkles,
    href: "/shop?category=cosmetics",
    accent: "from-pink-100/90 via-white/40 to-rose-50/80",
    chip: "bg-pink-100 text-pink-700",
    homeColor: "from-pink-200/80 to-fuchsia-100/70 text-pink-700",
  },
  {
    value: "wellness",
    label: "Health & Wellness",
    description: "Wellness and vitality products to support healthy routines.",
    icon: Leaf,
    href: "/shop?category=wellness",
    accent: "from-emerald-100/90 via-white/40 to-lime-50/80",
    chip: "bg-emerald-100 text-emerald-700",
    homeColor: "from-emerald-200/80 to-lime-100/70 text-emerald-700",
  },
  {
    value: "scent",
    label: "Perfumes & Scents",
    description: "Fragrances and scented goods with soft, lasting signature notes.",
    icon: Heart,
    href: "/shop?category=scent",
    accent: "from-violet-100/90 via-white/40 to-purple-50/80",
    chip: "bg-violet-100 text-violet-700",
    homeColor: "from-violet-200/80 to-purple-100/70 text-violet-700",
  },
];

export function marketplaceCategoryLabel(value: string) {
  return PRODUCT_CATEGORIES.find((c) => c.value === value)?.label ?? value.replace(/_/g, " ");
}

export const MARKETPLACE_CATEGORY_ORDER: ProductCategory[] = PRODUCT_CATEGORIES.map(
  (c) => c.value
);
