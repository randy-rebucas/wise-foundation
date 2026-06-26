import type { MetadataRoute } from "next";
import { absoluteUrl, getSiteUrl } from "@/lib/seo/site";
import {
  listMarketplaceProductSlugs,
  listPublicMarketplaceReviews,
} from "@/lib/services/marketplace.service";

const STATIC_PATHS = [
  "/",
  "/shop",
  "/about-us",
  "/contact",
  "/categories",
  "/reviews",
  "/faqs",
  "/shipping-delivery",
  "/returns-refunds",
  "/privacy-policy",
] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: absoluteUrl(path, siteUrl),
    lastModified: now,
    changeFrequency: path === "/" ? "daily" : "weekly",
    priority: path === "/" ? 1 : 0.8,
  }));

  const [products, reviewsResult] = await Promise.allSettled([
    listMarketplaceProductSlugs(),
    listPublicMarketplaceReviews({ limit: 100 }),
  ]);

  const productEntries: MetadataRoute.Sitemap =
    products.status === "fulfilled"
      ? products.value.map((product) => ({
          url: absoluteUrl(`/product/${encodeURIComponent(product.slug)}`, siteUrl),
          lastModified: product.updatedAt ?? now,
          changeFrequency: "weekly" as const,
          priority: 0.7,
        }))
      : [];

  const reviewEntries: MetadataRoute.Sitemap =
    reviewsResult.status === "fulfilled"
      ? reviewsResult.value.reviews.map((review) => ({
          url: absoluteUrl(`/reviews/${review.id}`, siteUrl),
          lastModified: now,
          changeFrequency: "monthly" as const,
          priority: 0.5,
        }))
      : [];

  return [...staticEntries, ...productEntries, ...reviewEntries];
}
