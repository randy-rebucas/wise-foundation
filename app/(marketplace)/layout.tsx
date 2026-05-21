import type { Metadata } from "next";
import { MarketplaceLayoutClient } from "@/components/marketplace/MarketplaceLayoutClient";
import { getPublicAppSettings } from "@/lib/services/appSettings.service";
import { buildSiteJsonLdScript, buildStorefrontMetadata } from "@/lib/seo/site";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicAppSettings();
  return buildStorefrontMetadata(settings);
}

export default async function MarketplaceGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getPublicAppSettings();
  const jsonLd = buildSiteJsonLdScript(settings);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <MarketplaceLayoutClient>{children}</MarketplaceLayoutClient>
    </>
  );
}
