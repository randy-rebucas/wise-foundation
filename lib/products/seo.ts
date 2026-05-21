import type { Metadata } from "next";
import { getPublicAppSettings } from "@/lib/services/appSettings.service";
import { resolveProductShortDescription } from "@/lib/products/productCopy";
import { stripMarkdownPlainText } from "@/lib/markdown/stripMarkdown";
import { absoluteUrl, getSiteUrl, imageAbsoluteUrl } from "@/lib/seo/site";

export type ProductSeoSource = {
  name: string;
  slug: string;
  description?: string | null;
  shortDescription?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  images?: string[];
  retailPrice: number;
  category?: string;
  sku?: string;
  stock?: number;
};

export function resolveProductSeoTitle(
  product: ProductSeoSource,
  appName: string
): string {
  const custom = product.seoTitle?.trim();
  if (custom) return custom;
  return `${product.name} | ${appName}`;
}

export function resolveProductSeoDescription(product: ProductSeoSource): string {
  const custom = product.seoDescription?.trim();
  if (custom) return stripMarkdownPlainText(custom);
  return resolveProductShortDescription(product);
}

export async function buildProductPageMetadata(
  product: ProductSeoSource
): Promise<Metadata> {
  const settings = await getPublicAppSettings();
  const siteUrl = getSiteUrl();
  const title = resolveProductSeoTitle(product, settings.appName);
  const description = resolveProductSeoDescription(product);
  const canonical = absoluteUrl(`/product/${encodeURIComponent(product.slug)}`, siteUrl);
  const image = imageAbsoluteUrl(product.images?.[0], siteUrl);

  return {
    title,
    description: description || undefined,
    alternates: { canonical },
    openGraph: {
      type: "website",
      title,
      description: description || undefined,
      url: canonical,
      siteName: settings.appName,
      ...(image ? { images: [{ url: image, alt: product.name }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description: description || undefined,
      ...(image ? { images: [image] } : {}),
    },
  };
}

function resolveProductAvailability(stock: number | undefined): string {
  const inStock = (stock ?? 0) > 0;
  return inStock
    ? "https://schema.org/InStock"
    : "https://schema.org/OutOfStock";
}

export function buildProductJsonLd(
  product: ProductSeoSource,
  opts: { appName: string; siteUrl: string; currency: string; stock?: number }
) {
  const url = absoluteUrl(`/product/${encodeURIComponent(product.slug)}`, opts.siteUrl);
  const image = imageAbsoluteUrl(product.images?.[0], opts.siteUrl);
  const description = resolveProductSeoDescription(product) || product.description?.trim();
  const stock = opts.stock ?? product.stock;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: description || undefined,
    sku: product.sku || undefined,
    image: image ? [image] : undefined,
    category: product.category || undefined,
    url,
    brand: {
      "@type": "Brand",
      name: opts.appName,
    },
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: opts.currency,
      price: product.retailPrice,
      availability: resolveProductAvailability(stock),
    },
  };
}

export async function buildProductJsonLdScript(
  product: ProductSeoSource,
  stock?: number
): Promise<string> {
  const settings = await getPublicAppSettings();
  const siteUrl = getSiteUrl();
  return JSON.stringify(
    buildProductJsonLd(product, {
      appName: settings.appName,
      siteUrl,
      currency: settings.currency,
      stock,
    })
  ).replace(/</g, "\\u003c");
}
