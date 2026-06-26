import type { MetadataRoute } from "next";
import { absoluteUrl, getSiteUrl } from "@/lib/seo/site";

const DISALLOW_PATHS = [
  "/api/",
  "/account",
  "/cart",
  "/checkout",
  "/login",
  "/setup",
  "/maintenance",
  "/pos",
  "/products",
  "/inventory",
  "/dashboard",
  "/settings",
  "/purchase-orders",
  "/admin",
  "/orders",
  "/members",
  "/commissions",
  "/deliveries",
  "/reports",
  "/media",
  "/help",
  "/org-dashboard",
  "/org-panel",
  "/reseller-sales",
];

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();
  const isRealUrl = siteUrl.startsWith("https://") || (siteUrl.startsWith("http://") && !siteUrl.includes("localhost"));

  return {
    rules: {
      userAgent: "*",
      disallow: DISALLOW_PATHS,
    },
    ...(isRealUrl ? { sitemap: absoluteUrl("/sitemap.xml", siteUrl) } : {}),
  };
}
