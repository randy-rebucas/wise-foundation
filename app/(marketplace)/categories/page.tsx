import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getPublicAppSettings } from "@/lib/services/appSettings.service";
import { buildPageMetadata } from "@/lib/seo/site";
import { MarketplaceFooter } from "@/components/marketplace/MarketplaceFooter";
import { MarketplacePageShell } from "@/components/marketplace/MarketplacePageShell";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Beaker,
  Grid3X3,
  Heart,
  Home,
  Leaf,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { MARKETPLACE_STOCK_IMAGES } from "@/lib/marketplace/stockImages";
import type { ElementType } from "react";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicAppSettings();
  return buildPageMetadata({
    title: "Our Ingredients & Categories",
    description: `Explore ${settings.appName} skincare categories—cleansers, serums, moisturizers, and more.`,
    path: "/categories",
    settings,
  });
}

const HERO_FLOATS = [
  { image: MARKETPLACE_STOCK_IMAGES.cleanser, label: "Gentle cleanse", position: "left-[6%] top-[14%] h-44 w-32 -rotate-6 sm:left-[10%] sm:h-52 sm:w-36" },
  { image: MARKETPLACE_STOCK_IMAGES.serum, label: "Daily radiance", position: "left-[38%] top-[2%] h-52 w-36 sm:left-[40%] sm:h-60 sm:w-40" },
  { image: MARKETPLACE_STOCK_IMAGES.collection, label: "Full ritual", position: "right-[4%] top-[22%] h-40 w-36 rotate-6 sm:right-[8%] sm:h-48 sm:w-40" },
] as const;

type CategoryCard = {
  title: string;
  subtitle: string;
  description: string;
  icon: ElementType;
  image: string;
  href: string;
  accent: string;
  chip: string;
};

const CATEGORIES: CategoryCard[] = [
  {
    title: "Cleansers",
    subtitle: "Homecare",
    description: "Deep cleanse and refresh without stripping your skin barrier.",
    icon: Home,
    image: MARKETPLACE_STOCK_IMAGES.cleanser,
    href: "/shop?category=homecare",
    accent: "from-sky-100/90 via-white/40 to-blue-50/80",
    chip: "bg-blue-100 text-blue-700",
  },
  {
    title: "Toners",
    subtitle: "Cosmetics",
    description: "Balance, hydrate, and prep skin for serums and moisturizers.",
    icon: Sparkles,
    image: MARKETPLACE_STOCK_IMAGES.botanical,
    href: "/shop?category=cosmetics",
    accent: "from-violet-100/90 via-white/40 to-purple-50/80",
    chip: "bg-violet-100 text-violet-700",
  },
  {
    title: "Serums",
    subtitle: "Wellness",
    description: "Concentrated actives to target glow, texture, and fine lines.",
    icon: Leaf,
    image: MARKETPLACE_STOCK_IMAGES.serum,
    href: "/shop?category=wellness",
    accent: "from-pink-100/90 via-white/40 to-rose-50/80",
    chip: "bg-pink-100 text-pink-700",
  },
  {
    title: "Moisturizers",
    subtitle: "Scent & care",
    description: "Lock in hydration with lightweight, skin-loving formulas.",
    icon: ShieldCheck,
    image: MARKETPLACE_STOCK_IMAGES.moisturizer,
    href: "/shop?category=scent",
    accent: "from-emerald-100/90 via-white/40 to-lime-50/80",
    chip: "bg-emerald-100 text-emerald-700",
  },
  {
    title: "All products",
    subtitle: "Full catalog",
    description: "Browse every listing in one place—new arrivals and bestsellers.",
    icon: Grid3X3,
    image: MARKETPLACE_STOCK_IMAGES.collection,
    href: "/shop",
    accent: "from-fuchsia-100/90 via-white/40 to-purple-50/80",
    chip: "bg-purple-100 text-purple-700",
  },
];

const INGREDIENT_PROMISES = [
  {
    title: "Natural ingredients",
    description: "Botanical extracts chosen for gentle, effective care.",
    icon: Leaf,
    tone: "bg-emerald-100 text-emerald-600",
  },
  {
    title: "Dermatologically tested",
    description: "Formulas evaluated for everyday use on varied skin types.",
    icon: Beaker,
    tone: "bg-blue-100 text-blue-600",
  },
  {
    title: "Cruelty free",
    description: "We never test on animals—beauty with compassion.",
    icon: Heart,
    tone: "bg-pink-100 text-pink-600",
  },
  {
    title: "Safe & effective",
    description: "Thoughtful concentrations—visible results, minimal fuss.",
    icon: ShieldCheck,
    tone: "bg-violet-100 text-violet-600",
  },
] as const;

export default function CategoriesPage() {
  return (
    <MarketplacePageShell>
        {/* Hero */}
        <section className="relative isolate overflow-hidden rounded-[2.25rem] border border-white/60 bg-white/20 px-6 py-10 shadow-[0_24px_80px_rgba(94,70,135,0.16)] backdrop-blur-xl sm:px-10 lg:min-h-[420px]">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_78%_42%,rgba(255,255,255,0.72),transparent_26%),radial-gradient(circle_at_88%_38%,rgba(255,51,204,0.14),transparent_38%)]" />
          <div className="grid gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.12em] text-[#6ea43f]">
                Shop by category
              </p>
              <h1 className="mt-4 font-[family-name:var(--font-playfair-display)] text-4xl font-semibold leading-tight tracking-tight text-[#1e3157] sm:text-5xl lg:text-6xl">
                Our
                <span className="block font-[family-name:var(--font-great-vibes)] text-5xl font-normal text-[#d965c9] sm:text-6xl">
                  Ingredients
                </span>
              </h1>
              <div className="mt-4 flex items-center gap-2 text-[#6ea43f]">
                <span className="h-px w-10 bg-[#6ea43f]/70" />
                <Leaf className="h-4 w-4" aria-hidden />
                <span className="h-px w-10 bg-[#6ea43f]/70" />
              </div>
              <p className="mt-5 max-w-md text-base leading-7 text-[#1e3157]/82">
                From gentle cleansers to nourishing serums—explore categories curated for healthy,
                radiant skin. Every formula is designed to work together as a simple daily ritual.
              </p>
              <Button
                className="mt-8 rounded-xl bg-gradient-to-r from-[#6ea43f] to-[#477d34] text-white shadow-md hover:opacity-95"
                asChild
              >
                <Link href="/shop">
                  Shop all products
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="relative min-h-[300px] sm:min-h-[340px] lg:min-h-[380px]">
              <div className="absolute inset-x-[6%] bottom-6 h-20 rounded-[50%] bg-white/45 blur-2xl" />
              <div className="absolute left-[28%] top-[8%] h-56 w-56 rounded-full border border-white/50 bg-white/15" />
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
            </div>
          </div>
        </section>

        {/* Category grid */}
        <section>
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3 px-1">
            <div>
              <h2 className="font-[family-name:var(--font-playfair-display)] text-2xl font-semibold text-[#1e3157] sm:text-3xl">
                Browse categories
              </h2>
              <p className="mt-1 text-sm text-[#2A4C6A]/75">
                Tap a category to open the shop with filters applied.
              </p>
            </div>
            <Button variant="outline" size="sm" className="rounded-xl border-white/80 bg-white/50" asChild>
              <Link href="/about-us">About our formulas</Link>
            </Button>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {CATEGORIES.map((category) => (
              <Link
                key={category.title}
                href={category.href}
                className="group flex flex-col overflow-hidden rounded-[1.75rem] border border-white/65 bg-white/50 shadow-[0_12px_40px_rgba(94,70,135,0.1)] backdrop-blur transition hover:-translate-y-1 hover:border-white hover:bg-white/75 hover:shadow-[0_22px_55px_rgba(94,70,135,0.18)]"
              >
                <div className={`relative aspect-[4/3] overflow-hidden bg-gradient-to-br ${category.accent}`}>
                  <Image
                    src={category.image}
                    alt={category.title}
                    fill
                    className="object-cover transition duration-500 group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1e3157]/50 via-[#1e3157]/5 to-transparent" />
                  <span
                    className={`absolute left-4 top-4 flex h-11 w-11 items-center justify-center rounded-full shadow-sm ${category.chip}`}
                  >
                    <category.icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="absolute bottom-4 left-4 rounded-full bg-white/85 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#3c2e60] backdrop-blur">
                    {category.subtitle}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="font-[family-name:var(--font-playfair-display)] text-xl font-semibold text-[#3c2e60]">
                    {category.title}
                  </h3>
                  <p className="mt-2 flex-1 text-sm leading-6 text-[#2A4C6A]/78">{category.description}</p>
                  <span className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#6ea43f]/12 px-3 py-2.5 text-sm font-semibold text-[#2B6B56] transition group-hover:bg-[#6ea43f]/20">
                    Shop now
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Ingredient promises */}
        <section className="rounded-[2rem] border border-white/60 bg-white/45 p-6 shadow-[0_18px_55px_rgba(94,70,135,0.14)] backdrop-blur-xl sm:p-8">
          <div className="mb-6 flex items-center justify-center gap-3 text-center">
            <Leaf className="h-5 w-5 text-[#6ea43f]" aria-hidden />
            <h2 className="font-[family-name:var(--font-playfair-display)] text-2xl font-semibold text-[#1e3157] sm:text-3xl">
              What we put in every bottle
            </h2>
            <Leaf className="h-5 w-5 text-[#6ea43f]" aria-hidden />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {INGREDIENT_PROMISES.map((item) => (
              <article
                key={item.title}
                className="flex items-start gap-3 rounded-2xl border border-white/60 bg-white/40 p-4 lg:border-r lg:last:border-r-0"
              >
                <span
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${item.tone}`}
                >
                  <item.icon className="h-6 w-6" aria-hidden />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-[#1e3157]">{item.title}</h3>
                  <p className="mt-1 text-xs leading-5 text-[#2A4C6A]/72">{item.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* CTA band */}
        <section className="grid gap-5 overflow-hidden rounded-[2rem] border border-white/65 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="relative min-h-[240px] overflow-hidden lg:min-h-full">
            <Image
              src={MARKETPLACE_STOCK_IMAGES.lifestyle}
              alt="Skincare formulation"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#1e3157]/25 via-transparent to-white/30 lg:bg-gradient-to-t lg:from-[#1e3157]/40 lg:to-transparent" />
          </div>
          <article className="flex flex-col justify-center bg-white/50 p-8 backdrop-blur sm:p-10">
            <p className="text-sm font-bold uppercase tracking-[0.12em] text-[#6ea43f]">
              Need guidance?
            </p>
            <h2 className="mt-3 font-[family-name:var(--font-playfair-display)] text-3xl font-semibold text-[#1e3157]">
              Not sure where to start?
            </h2>
            <p className="mt-4 text-sm leading-7 text-[#2A4C6A]/78">
              Read our FAQs for routine tips, shipping details, and how to choose products for your
              skin goals—or message our team for personalized suggestions.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button className="rounded-xl bg-gradient-to-r from-[#6ea43f] to-[#477d34] text-white" asChild>
                <Link href="/faqs">View FAQs</Link>
              </Button>
              <Button variant="outline" className="rounded-xl border-white/80 bg-white/60" asChild>
                <Link href="/contact">Contact us</Link>
              </Button>
            </div>
          </article>
        </section>

        <MarketplaceFooter />
    </MarketplacePageShell>
  );
}
