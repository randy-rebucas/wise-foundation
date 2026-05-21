import type { ProductCategory } from "@/types";

const CATEGORY_LABELS: Record<ProductCategory, string> = {
  homecare: "Cleansers",
  cosmetics: "Toners",
  wellness: "Serums",
  scent: "Moisturizers",
};

export function marketplaceCategoryLabel(value: string | undefined | null): string {
  if (!value) return "Product";
  return CATEGORY_LABELS[value as ProductCategory] ?? value.replace(/_/g, " ");
}
