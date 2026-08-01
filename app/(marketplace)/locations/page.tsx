import type { Metadata } from "next";
import { MapPin } from "lucide-react";
import { getPublicAppSettings } from "@/lib/services/appSettings.service";
import { getPublicLocations } from "@/lib/services/locations.service";
import { buildPageMetadata } from "@/lib/seo/site";
import { MarketplaceFooter } from "@/components/marketplace/MarketplaceFooter";
import { LocationsMap } from "@/components/marketplace/locations/LocationsMap";
import { cn } from "@/lib/utils";
import {
  MARKETPLACE_PAGE_FONT,
  MARKETPLACE_PAGE_INNER,
  MARKETPLACE_PAGE_OUTER,
} from "@/lib/marketplace/pageLayout";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicAppSettings();
  return buildPageMetadata({
    title: "Store Locator",
    description: `Find ${settings.appName} distributors, franchises, and partner locations near you.`,
    path: "/locations",
    settings,
  });
}

export default async function LocationsPage() {
  const settings = await getPublicAppSettings();
  const locations = await getPublicLocations();

  return (
    <div className={cn(MARKETPLACE_PAGE_OUTER, MARKETPLACE_PAGE_FONT, "pt-0 pb-0")}>
      <div className="-mx-4">
        <section className="relative isolate overflow-hidden bg-gradient-to-br from-[#FBE9BF] via-[#f6faf3] to-[#ECF3E8] px-4 py-10 sm:px-6 lg:py-12">
          <div className={cn(MARKETPLACE_PAGE_INNER, "text-center")}>
            <span className="inline-flex items-center gap-1.5 rounded-[10px] bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-[#a5691a]">
              <MapPin className="h-3.5 w-3.5" aria-hidden />
              Store Locator
            </span>
            <h1 className="mt-4 font-[family-name:var(--font-yellowtail)] text-5xl font-normal leading-tight text-[#2B6B56] sm:text-6xl">
              Find {settings.appName}
              <span className="block font-[family-name:var(--font-yellowtail)] text-5xl font-normal text-[#F79921] sm:text-6xl">
                Near You
              </span>
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-[#4a5568]">
              Browse our distributors, franchises, and partner locations across the country.
            </p>
          </div>
        </section>
      </div>

      <div className={cn(MARKETPLACE_PAGE_INNER, "mt-8 space-y-6")}>
        <section className="rounded-[10px] border border-white/65 bg-white/50 p-4 shadow-[0_18px_55px_rgba(70,90,58,0.14)] backdrop-blur-xl sm:p-6">
          <LocationsMap locations={locations} />
        </section>
      </div>

      <div className="-mx-4 mt-10">
        <MarketplaceFooter
          showSocial
          className="rounded-none border-0 shadow-none backdrop-blur-none"
          innerClassName={MARKETPLACE_PAGE_INNER}
        />
      </div>
    </div>
  );
}
