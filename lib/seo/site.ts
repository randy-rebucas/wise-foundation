import type { Metadata } from "next";
import type { PublicAppSettings } from "@/lib/types/appSettings";
import { resolveAppLogoSrc } from "@/lib/constants/branding";
import logger from "@/lib/logger";

const LOCALHOST_FALLBACK = "http://localhost:3000";
const GENERIC_DESCRIPTION_FALLBACK = "Shop online for quality products.";

export const ROBOTS_NOINDEX: Metadata["robots"] = {
  index: false,
  follow: false,
};

export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (raw) return raw.replace(/\/$/, "");
  if (process.env.NODE_ENV === "production") {
    logger.warn("[seo] NEXT_PUBLIC_APP_URL is not set; using localhost fallback for canonical URLs.");
  }
  return LOCALHOST_FALLBACK;
}

export function absoluteUrl(path: string, siteUrl?: string): string {
  const base = (siteUrl ?? getSiteUrl()).replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

export function imageAbsoluteUrl(
  image: string | undefined,
  siteUrl?: string
): string | undefined {
  if (!image?.trim()) return undefined;
  const src = image.trim();
  if (/^https?:\/\//i.test(src)) return src;
  return absoluteUrl(src, siteUrl);
}

export function resolveSiteDescription(settings: PublicAppSettings): string {
  const seo = settings.seoDefaultDescription?.trim();
  if (seo) return seo;
  const tagline = settings.appTagline?.trim();
  if (tagline) return tagline;
  return GENERIC_DESCRIPTION_FALLBACK;
}

function resolveDefaultOgImage(settings: PublicAppSettings, siteUrl: string): string | undefined {
  const og = settings.seoOgImageUrl?.trim();
  if (og) return imageAbsoluteUrl(og, siteUrl);
  const logo = settings.appLogoUrl?.trim();
  if (logo) return imageAbsoluteUrl(logo, siteUrl);
  return imageAbsoluteUrl(resolveAppLogoSrc(), siteUrl);
}

function buildSocialImages(
  imageUrl: string | undefined,
  alt: string
): Pick<Metadata, "openGraph" | "twitter"> {
  if (!imageUrl) return {};
  return {
    openGraph: {
      images: [{ url: imageUrl, alt }],
    },
    twitter: {
      card: "summary_large_image",
      images: [imageUrl],
    },
  };
}

export function buildRootMetadata(settings: PublicAppSettings): Metadata {
  const siteUrl = getSiteUrl();
  const description = resolveSiteDescription(settings);
  const ogImage = resolveDefaultOgImage(settings, siteUrl);
  const social = buildSocialImages(ogImage, settings.appName);

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: settings.appName,
      template: `%s | ${settings.appName}`,
    },
    description,
    openGraph: {
      type: "website",
      locale: "en_US",
      url: siteUrl,
      siteName: settings.appName,
      title: settings.appName,
      description,
      ...social.openGraph,
    },
    twitter: {
      title: settings.appName,
      description,
      ...social.twitter,
    },
  };
}

export type BuildPageMetadataInput = {
  title: string;
  description?: string;
  path: string;
  settings: PublicAppSettings;
  noindex?: boolean;
};

export function buildPageMetadata(input: BuildPageMetadataInput): Metadata {
  const siteUrl = getSiteUrl();
  const description = input.description?.trim() || resolveSiteDescription(input.settings);
  const canonical = absoluteUrl(input.path, siteUrl);
  const ogImage = resolveDefaultOgImage(input.settings, siteUrl);
  const social = buildSocialImages(ogImage, input.settings.appName);

  return {
    title: input.title,
    description,
    alternates: { canonical },
    ...(input.noindex ? { robots: ROBOTS_NOINDEX } : {}),
    openGraph: {
      type: "website",
      title: input.title,
      description,
      url: canonical,
      siteName: input.settings.appName,
      ...social.openGraph,
    },
    twitter: {
      title: input.title,
      description,
      ...social.twitter,
    },
  };
}

export function buildStorefrontMetadata(settings: PublicAppSettings): Metadata {
  return buildPageMetadata({
    title: settings.appName,
    path: "/",
    settings,
  });
}

export function buildSiteJsonLd(settings: PublicAppSettings): object {
  const siteUrl = getSiteUrl();
  const logo = resolveDefaultOgImage(settings, siteUrl);

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: settings.appName,
        url: siteUrl,
        description: resolveSiteDescription(settings),
      },
      {
        "@type": "Organization",
        name: settings.appName,
        url: siteUrl,
        ...(logo ? { logo } : {}),
      },
    ],
  };
}

export function buildSiteJsonLdScript(settings: PublicAppSettings): string {
  return JSON.stringify(buildSiteJsonLd(settings)).replace(/</g, "\\u003c");
}
