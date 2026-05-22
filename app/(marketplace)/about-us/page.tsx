import type { Metadata } from "next";
import Link from "next/link";
import { getPublicAppSettings } from "@/lib/services/appSettings.service";
import { getMarketplaceCategorySampleImages } from "@/lib/services/marketplace.service";
import { buildPageMetadata } from "@/lib/seo/site";
import {
  pickCategoryProductImage,
  pickHeroFloatImages,
} from "@/lib/marketplace/categoryImages";
import { MarketplaceFillImage } from "@/components/marketplace/MarketplaceFillImage";
import { MarketplaceFooter } from "@/components/marketplace/MarketplaceFooter";
import { MarketplacePageShell } from "@/components/marketplace/MarketplacePageShell";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Beaker,
  Droplets,
  Heart,
  Leaf,
  PackageCheck,
  ShieldCheck,
  Sparkles,
  Sprout,
} from "lucide-react";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicAppSettings();
  return buildPageMetadata({
    title: "About Us",
    description: `Learn about ${settings.appName}, our story, and our commitment to quality skincare.`,
    path: "/about-us",
    settings,
  });
}

const HERO_FLOAT_META = [
  { label: "Clean botanical care", position: "left-[6%] top-[18%] h-48 w-32 -rotate-6 sm:left-[12%] sm:h-52 sm:w-36" },
  { label: "Daily glow essentials", position: "left-[38%] top-[4%] h-52 w-36 sm:left-[40%] sm:h-60 sm:w-40" },
  { label: "Pure skincare rituals", position: "right-[6%] top-[24%] h-44 w-36 rotate-6 sm:right-[10%] sm:h-48 sm:w-40" },
] as const;

const promises = [
  {
    title: "Clean & Safe",
    description: "No harsh chemicals—only skin-loving care.",
    icon: Leaf,
    tone: "bg-emerald-100 text-emerald-600",
  },
  {
    title: "Effective Results",
    description: "Formulated to deliver a visible, healthy glow.",
    icon: Droplets,
    tone: "bg-blue-100 text-blue-600",
  },
  {
    title: "For Every Skin",
    description: "Gentle routines suitable for all skin types.",
    icon: Heart,
    tone: "bg-pink-100 text-pink-600",
  },
  {
    title: "Sustainable Beauty",
    description: "We care for your skin and our planet.",
    icon: Sprout,
    tone: "bg-violet-100 text-violet-600",
  },
  {
    title: "Cruelty Free",
    description: "We never test on animals.",
    icon: ShieldCheck,
    tone: "bg-orange-100 text-orange-600",
  },
] as const;

export default async function AboutUsPage() {
  const settings = await getPublicAppSettings();
  const appName = settings.appName;
  const samples = await getMarketplaceCategorySampleImages();
  const heroImages = pickHeroFloatImages(samples, ["homecare", "wellness", "cosmetics"]);
  const heroFloats = HERO_FLOAT_META.map((meta, i) => ({ ...meta, image: heroImages[i] }));
  const storyImage = pickCategoryProductImage(samples, "cosmetics");

  return (
    <MarketplacePageShell>
        {/* Hero */}
        <section className="relative isolate overflow-hidden rounded-[2.25rem] border border-white/60 bg-white/20 px-6 py-10 shadow-[0_24px_80px_rgba(94,70,135,0.16)] backdrop-blur-xl sm:px-10 lg:min-h-[460px]">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_78%_42%,rgba(255,255,255,0.72),transparent_26%),radial-gradient(circle_at_88%_38%,rgba(255,51,204,0.14),transparent_38%)]" />
          <div className="grid gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.12em] text-[#6ea43f]">
                About {appName}
              </p>
              <h1 className="mt-4 font-[family-name:var(--font-playfair-display)] text-4xl font-semibold leading-tight tracking-tight text-[#1e3157] sm:text-5xl lg:text-6xl">
                Naturally Beautiful,
                <span className="block font-[family-name:var(--font-great-vibes)] text-5xl font-normal text-[#d965c9] sm:text-6xl">
                  Confidently You.
                </span>
              </h1>
              <div className="mt-4 flex items-center gap-2 text-[#6ea43f]">
                <span className="h-px w-10 bg-[#6ea43f]/70" />
                <Leaf className="h-4 w-4" aria-hidden />
                <span className="h-px w-10 bg-[#6ea43f]/70" />
              </div>
              <p className="mt-5 max-w-md text-base leading-7 text-[#1e3157]/82">
                At {appName}, we believe glowing skin starts with the right care and pure
                ingredients. Our mission is to help you feel confident in your skin every day.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <article className="flex items-center gap-3 rounded-2xl border border-white/50 bg-white/35 p-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-sm">
                    <Leaf className="h-6 w-6" aria-hidden />
                  </span>
                  <div>
                    <h2 className="font-[family-name:var(--font-playfair-display)] text-base font-semibold text-[#1e3157]">
                      Natural ingredients
                    </h2>
                    <p className="mt-1 text-xs leading-5 text-[#2A4C6A]/75">
                      Carefully selected from the best nature has to offer.
                    </p>
                  </div>
                </article>
                <article className="flex items-center gap-3 rounded-2xl border border-white/50 bg-white/35 p-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600 shadow-sm">
                    <Beaker className="h-6 w-6" aria-hidden />
                  </span>
                  <div>
                    <h2 className="font-[family-name:var(--font-playfair-display)] text-base font-semibold text-[#1e3157]">
                      Clinically tested
                    </h2>
                    <p className="mt-1 text-xs leading-5 text-[#2A4C6A]/75">
                      Safe, effective formulas for everyday use.
                    </p>
                  </div>
                </article>
              </div>

              <Button
                className="mt-8 rounded-xl bg-gradient-to-r from-[#6ea43f] to-[#477d34] text-white shadow-md hover:opacity-95"
                asChild
              >
                <Link href="/shop">
                  Explore the shop
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="relative min-h-[300px] sm:min-h-[360px] lg:min-h-[400px]">
              <div className="absolute inset-x-[6%] bottom-8 h-20 rounded-[50%] bg-white/45 blur-2xl" />
              <div className="absolute left-[24%] top-[6%] h-64 w-64 rounded-full border border-white/55 bg-white/15" />
              <div className="absolute bottom-8 right-[6%] h-24 w-24 rounded-full bg-pink-300/35 blur-md" />

              {heroFloats.map((card) => (
                <div
                  key={card.label}
                  className={`absolute ${card.position} overflow-hidden rounded-[1.75rem] border border-white/75 bg-white/60 p-2 shadow-[0_22px_60px_rgba(68,47,107,0.22)] backdrop-blur`}
                >
                  <div className="relative h-[calc(100%-1.5rem)] min-h-[7.5rem] overflow-hidden rounded-[1.35rem]">
                    <MarketplaceFillImage
                      src={card.image}
                      alt={card.label}
                      sizes="(max-width: 768px) 140px, 180px"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1e3157]/55 via-transparent to-transparent" />
                  </div>
                  <p className="mt-1.5 text-center text-[10px] font-semibold text-[#1e3157]">
                    {card.label}
                  </p>
                </div>
              ))}

              <div className="absolute bottom-6 left-[42%] flex w-44 flex-col items-center rounded-3xl border border-white/75 bg-white/75 p-4 shadow-[0_20px_55px_rgba(68,47,107,0.18)] backdrop-blur">
                <PackageCheck className="h-10 w-10 text-[#6ea43f]" aria-hidden />
                <p className="mt-2 text-center text-xs font-semibold text-[#1e3157]">
                  Gentle skincare essentials
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Promise */}
        <section className="rounded-[2rem] border border-white/65 bg-white/50 p-6 shadow-[0_18px_55px_rgba(94,70,135,0.14)] backdrop-blur-xl sm:p-8">
          <div className="mb-6 flex items-center justify-center gap-3 text-center">
            <Leaf className="h-5 w-5 text-[#6ea43f]" aria-hidden />
            <h2 className="font-[family-name:var(--font-playfair-display)] text-2xl font-semibold text-[#1e3157] sm:text-3xl">
              Our promise to you
            </h2>
            <Leaf className="h-5 w-5 text-[#6ea43f]" aria-hidden />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {promises.map((promise) => (
              <article
                key={promise.title}
                className="flex items-start gap-3 rounded-2xl border border-white/60 bg-white/40 p-4 lg:border-r lg:last:border-r-0"
              >
                <span
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${promise.tone}`}
                >
                  <promise.icon className="h-6 w-6" aria-hidden />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-[#1e3157]">{promise.title}</h3>
                  <p className="mt-1 text-xs leading-5 text-[#2A4C6A]/72">{promise.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Story */}
        <section className="grid gap-5 overflow-hidden rounded-[2rem] border border-white/65 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="relative min-h-[280px] overflow-hidden sm:min-h-[320px] lg:min-h-full">
            <MarketplaceFillImage
              src={storyImage}
              alt={`${appName} skincare`}
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#1e3157]/20 via-pink-100/15 to-white/40 lg:bg-gradient-to-t lg:from-[#1e3157]/35 lg:to-transparent" />
            <Sparkles
              className="absolute right-8 top-8 h-10 w-10 text-[#d965c9]/90 drop-shadow-sm"
              aria-hidden
            />
          </div>

          <article className="flex flex-col justify-center bg-white/50 p-8 backdrop-blur sm:p-10">
            <p className="text-sm font-bold uppercase tracking-[0.12em] text-[#6ea43f]">Our story</p>
            <h2 className="mt-3 font-[family-name:var(--font-playfair-display)] text-3xl font-semibold text-[#1e3157] sm:text-4xl">
              From nature,
              <span className="block font-[family-name:var(--font-great-vibes)] text-[#d965c9]">
                for you
              </span>
            </h2>
            <p className="mt-4 text-sm leading-7 text-[#2A4C6A]/78">
              {appName} was born from a simple belief: skincare should be pure, effective, and
              accessible to everyone. Inspired by nature and backed by science, we create products
              that bring out your natural glow and celebrate your unique beauty.
            </p>
            <p className="mt-4 text-sm leading-7 text-[#2A4C6A]/78">
              Every formula is developed with transparency in mind—so you know what you are putting
              on your skin and why it works.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button className="rounded-xl bg-gradient-to-r from-[#6ea43f] to-[#477d34] text-white" asChild>
                <Link href="/categories">
                  Our ingredients
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" className="rounded-xl border-white/80 bg-white/60" asChild>
                <Link href="/contact">Get in touch</Link>
              </Button>
            </div>
          </article>
        </section>

        <MarketplaceFooter />
    </MarketplacePageShell>
  );
}
