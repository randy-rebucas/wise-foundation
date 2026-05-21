import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getPublicAppSettings } from "@/lib/services/appSettings.service";
import { buildPageMetadata } from "@/lib/seo/site";
import { MARKETPLACE_STOCK_IMAGES } from "@/lib/marketplace/stockImages";
import { MarketplaceFooter } from "@/components/marketplace/MarketplaceFooter";
import { MarketplacePageShell } from "@/components/marketplace/MarketplacePageShell";
import { PublicReviewsList } from "@/components/marketplace/PublicReviewsList";
import { Button } from "@/components/ui/button";
import { BadgeCheck, Heart, Leaf, MessageCircle, Star } from "lucide-react";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicAppSettings();
  return buildPageMetadata({
    title: "Reviews",
    description: `Read customer reviews and ratings for ${settings.appName} products.`,
    path: "/reviews",
    settings,
  });
}

const HERO_FLOATS = [
  {
    image: MARKETPLACE_STOCK_IMAGES.cleanser,
    label: "Glow cleanser",
    position: "left-[6%] top-[20%] h-44 w-32 -rotate-6 sm:left-[12%] sm:h-48 sm:w-36",
  },
  {
    image: MARKETPLACE_STOCK_IMAGES.serum,
    label: "Radiance serum",
    position: "left-[38%] top-[4%] h-52 w-36 sm:left-[40%] sm:h-56 sm:w-40",
  },
  {
    image: MARKETPLACE_STOCK_IMAGES.collection,
    label: "Customer favorite",
    position: "right-[6%] top-[26%] h-40 w-36 rotate-6 sm:right-[10%] sm:h-44 sm:w-40",
  },
] as const;

const heroHighlights = [
  {
    label: "Real reviews",
    value: "Verified buyers",
    icon: BadgeCheck,
    tone: "bg-emerald-100 text-emerald-600",
  },
  {
    label: "Community",
    value: "Growing daily",
    icon: MessageCircle,
    tone: "bg-violet-100 text-violet-600",
  },
  {
    label: "Quality",
    value: "5-star favorites",
    icon: Star,
    tone: "bg-amber-100 text-amber-600",
  },
] as const;

export default async function ReviewsPage() {
  const settings = await getPublicAppSettings();
  const appName = settings.appName;

  return (
    <MarketplacePageShell>
        {/* Hero */}
        <section className="relative isolate overflow-hidden rounded-[2.25rem] border border-white/60 bg-white/20 px-6 py-10 shadow-[0_24px_80px_rgba(94,70,135,0.16)] backdrop-blur-xl sm:px-10 lg:min-h-[420px]">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_76%_42%,rgba(255,255,255,0.75),transparent_26%),radial-gradient(circle_at_88%_38%,rgba(255,51,204,0.16),transparent_38%)]" />
          <div className="grid gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.12em] text-[#6ea43f]">
                Customer reviews
              </p>
              <h1 className="mt-4 font-[family-name:var(--font-playfair-display)] text-4xl font-semibold leading-tight tracking-tight text-[#1e3157] sm:text-5xl lg:text-6xl">
                Loved by thousands,
                <span className="block font-[family-name:var(--font-great-vibes)] text-[#d965c9]">
                  trusted always.
                </span>
              </h1>
              <div className="mt-4 flex items-center gap-2 text-[#6ea43f]">
                <span className="h-px w-10 bg-[#6ea43f]/70" />
                <Leaf className="h-4 w-4" aria-hidden />
                <span className="h-px w-10 bg-[#6ea43f]/70" />
              </div>
              <p className="mt-5 max-w-md text-base leading-7 text-[#1e3157]/82">
                Real experiences from real people. See how {appName} skincare is making a
                difference in daily routines across the community.
              </p>

              <div className="mt-8 flex w-full gap-3">
                {heroHighlights.map((stat) => (
                  <article
                    key={stat.label}
                    className="flex min-w-0 flex-1 basis-0 flex-col items-center gap-2 rounded-2xl border border-white/55 bg-white/40 p-3 text-center"
                  >
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${stat.tone}`}
                    >
                      <stat.icon className="h-5 w-5" aria-hidden />
                    </span>
                    <div className="min-w-0 w-full">
                      <p className="font-[family-name:var(--font-playfair-display)] text-sm font-semibold leading-snug text-[#1e3157] sm:text-base">
                        {stat.value}
                      </p>
                      <p className="mt-0.5 text-[10px] font-medium leading-tight text-[#2A4C6A]/70 sm:text-[11px]">
                        {stat.label}
                      </p>
                    </div>
                  </article>
                ))}
              </div>

              <Button
                className="mt-8 rounded-xl bg-gradient-to-r from-[#6ea43f] to-[#477d34] text-white shadow-md hover:opacity-95"
                asChild
              >
                <Link href="/shop">Shop bestsellers</Link>
              </Button>
            </div>

            <div className="relative min-h-[300px] sm:min-h-[340px] lg:min-h-[370px]">
              <div className="absolute inset-x-[6%] bottom-8 h-20 rounded-[50%] bg-white/45 blur-2xl" />
              <div className="absolute left-[26%] top-[8%] h-60 w-60 rounded-full border border-white/55 bg-white/15" />

              {HERO_FLOATS.map((card) => (
                <div
                  key={card.label}
                  className={`absolute ${card.position} overflow-hidden rounded-[1.75rem] border border-white/75 bg-white/60 p-2 shadow-[0_22px_60px_rgba(68,47,107,0.22)] backdrop-blur`}
                >
                  <div className="relative h-[calc(100%-1.5rem)] min-h-[7rem] overflow-hidden rounded-[1.35rem]">
                    <Image
                      src={card.image}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 140px, 180px"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1e3157]/55 via-transparent to-transparent" />
                  </div>
                  <p className="mt-1.5 text-center text-[10px] font-semibold text-[#1e3157]">
                    {card.label}
                  </p>
                </div>
              ))}

              <div className="absolute bottom-6 left-[40%] flex items-center gap-1 rounded-full border border-white/75 bg-white/80 px-3 py-2 shadow-md backdrop-blur">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${i < 5 ? "fill-[#FBC02D] text-[#FBC02D]" : "text-[#FBC02D]/30"}`}
                    aria-hidden
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Reviews list */}
        <section className="rounded-[2rem] border border-white/65 bg-white/50 p-5 shadow-[0_18px_55px_rgba(94,70,135,0.14)] backdrop-blur-xl sm:p-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-center gap-3">
              <Leaf className="h-5 w-5 text-[#6ea43f]" aria-hidden />
              <h2 className="font-[family-name:var(--font-playfair-display)] text-2xl font-semibold text-[#1e3157] sm:text-3xl">
                What our customers say
              </h2>
            </div>
            <Button variant="outline" size="sm" className="rounded-xl border-white/80 bg-white/55" asChild>
              <Link href="/account/login">Sign in to review</Link>
            </Button>
          </div>

          <PublicReviewsList />

          <div className="mt-10 flex flex-col items-center gap-4 rounded-2xl border border-white/60 bg-gradient-to-r from-[#f6def8]/60 to-white/50 p-6 sm:flex-row sm:items-center">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-pink-100 text-pink-600">
              <Heart className="h-7 w-7" aria-hidden />
            </span>
            <div className="flex-1 text-center sm:text-left">
              <p className="font-[family-name:var(--font-playfair-display)] text-xl font-semibold text-[#1e3157]">
                Share your glow
              </p>
              <p className="mt-1 text-sm leading-6 text-[#2A4C6A]/72">
                Purchased from us? Sign in and leave a review after your order is delivered—your
                feedback helps others choose with confidence.
              </p>
            </div>
            <Button className="shrink-0 rounded-xl bg-gradient-to-r from-[#6ea43f] to-[#477d34] text-white" asChild>
              <Link href="/account/reviews">Write a review</Link>
            </Button>
          </div>
        </section>

        <MarketplaceFooter />
    </MarketplacePageShell>
  );
}
