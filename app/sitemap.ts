import type { MetadataRoute } from "next";
import { absoluteUrl, getSiteUrl } from "@/lib/seo/site";
import { listMarketplaceProductSlugs } from "@/lib/services/marketplace.service";

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

  const products = await listMarketplaceProductSlugs();
  const productEntries: MetadataRoute.Sitemap = products.map((product) => ({
    url: absoluteUrl(`/product/${encodeURIComponent(product.slug)}`, siteUrl),
    lastModified: product.updatedAt ?? now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticEntries, ...productEntries];
}
