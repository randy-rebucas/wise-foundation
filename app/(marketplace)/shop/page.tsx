import type { Metadata } from "next";
import { Suspense } from "react";
import { ImageIcon } from "lucide-react";
import { MarketplacePageShell } from "@/components/marketplace/MarketplacePageShell";
import { Skeleton } from "@/components/ui/skeleton";
import { ShopPageClient } from "./ShopPageClient";
import { buildPageMetadata } from "@/lib/seo/site";
import { getPublicAppSettings } from "@/lib/services/appSettings.service";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicAppSettings();
  return buildPageMetadata({
    title: "Shop",
    description: `Browse all ${settings.appName} skincare products — cleansers, serums, and daily essentials.`,
    path: "/shop",
    settings,
  });
}

function ShopPageFallback() {
  return (
    <MarketplacePageShell>
      <section className="rounded-[2rem] border border-white/60 bg-white/25 p-8 shadow-[0_24px_80px_rgba(94,70,135,0.18)] backdrop-blur-xl">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="mt-4 h-5 w-96 max-w-full" />
      </section>
      <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="hidden space-y-4 lg:block">
          <Skeleton className="h-64 w-full rounded-2xl" />
        </aside>
        <main className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-3xl border border-white/65 bg-white/50 shadow backdrop-blur">
              <div className="relative aspect-square w-full">
                <Skeleton className="absolute inset-0 rounded-none" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <ImageIcon className="h-10 w-10 text-[#2A4C6A]/20" />
                </div>
              </div>
              <div className="space-y-3 p-4">
                <Skeleton className="h-3 w-16 rounded-full" />
                <Skeleton className="h-4 w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4 rounded-lg" />
                <Skeleton className="h-4 w-20 rounded-lg" />
                <Skeleton className="mt-2 h-9 w-full rounded-xl" />
              </div>
            </div>
          ))}
        </main>
      </div>
    </MarketplacePageShell>
  );
}

export default function MarketplaceShopPage() {
  return (
    <Suspense fallback={<ShopPageFallback />}>
      <ShopPageClient />
    </Suspense>
  );
}
