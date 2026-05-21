import type { Metadata } from "next";
import { getPublicAppSettings } from "@/lib/services/appSettings.service";
import { buildPageMetadata } from "@/lib/seo/site";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicAppSettings();
  return buildPageMetadata({
    title: "Shop",
    description: `Browse and shop all products at ${settings.appName}.`,
    path: "/shop",
    settings,
  });
}

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return children;
}
