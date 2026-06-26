import type { Metadata } from "next";
import { HomePageClient } from "@/app/(marketplace)/HomePageClient";
import {
  listMarketplaceProducts,
  getMarketplaceCategoryShowcase,
} from "@/lib/services/marketplace.service";

export const metadata: Metadata = {
  title: "Glowish — Get the Glow you wish",
  description:
    "Premium beauty and wellness products crafted with natural ingredients. Shop skincare, cosmetics, home care, and health essentials — dermatologically tested and cruelty free.",
  openGraph: {
    title: "Glowish — Get the Glow you wish",
    description:
      "Premium beauty and wellness products crafted with natural ingredients. Shop skincare, cosmetics, home care, and health essentials.",
    type: "website",
  },
};

export default async function MarketplaceHomePage() {
  const [productsResult, samplesResult] = await Promise.allSettled([
    listMarketplaceProducts({ page: 1, limit: 12 }),
    getMarketplaceCategoryShowcase(),
  ]);

  const products =
    productsResult.status === "fulfilled" ? (productsResult.value.data ?? []) : [];
  const meta =
    productsResult.status === "fulfilled"
      ? {
          total: productsResult.value.meta?.total ?? 0,
          hasMore: !!productsResult.value.meta?.hasMore,
        }
      : null;
  const categorySamples =
    samplesResult.status === "fulfilled" ? samplesResult.value : null;

  return (
    <HomePageClient
      initialProducts={products}
      initialMeta={meta}
      initialCategorySamples={categorySamples}
    />
  );
}
