import type { Metadata } from "next";
import Link from "next/link";
import { getPublicAppSettings } from "@/lib/services/appSettings.service";
import { getMarketplaceCategoryShowcase } from "@/lib/services/marketplace.service";
import { buildPageMetadata } from "@/lib/seo/site";
import {
  MARKETPLACE_CATEGORY_CARDS,
  marketplaceCategoryLabel,
} from "@/lib/marketplace/categories";
import { pickCatalogImage, pickHeroFloatImages } from "@/lib/marketplace/categoryImages";
import { MarketplaceFooter } from "@/components/marketplace/MarketplaceFooter";
import { MarketplaceFillImage } from "@/components/marketplace/MarketplaceFillImage";
import { MarketplacePageShell } from "@/components/marketplace/MarketplacePageShell";
import { Button } from "@/components/ui/button";
import { ArrowRight, Beaker, Heart, Leaf, ShieldCheck } from "lucide-react";
import type { ProductCategory } from "@/types";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicAppSettings();
  return buildPageMetadata({
    title: "Shop by Category",
    description: `Browse ${settings.appName} by category—Home Care, Cosmetics, Health & Wellness, and Perfumes & Scents.`,
    path: "/categories",
    settings,
  });
}

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

const HERO_FLOAT_META: {
  category: ProductCategory;
  label: string;
  position: string;
}[] = [
  {
    category: "homecare",
    label: "Home Care",
    position: "left-[6%] top-[14%] h-44 w-32 -rotate-6 sm:left-[10%] sm:h-52 sm:w-36",
  },
  {
    category: "cosmetics",
    label: "Cosmetics",
    position: "left-[38%] top-[2%] h-52 w-36 sm:left-[40%] sm:h-60 sm:w-40",
  },
  {
    category: "wellness",
    label: "Health & Wellness",
    position: "right-[4%] top-[22%] h-40 w-36 rotate-6 sm:right-[8%] sm:h-48 sm:w-40",
  },
];

export default async function CategoriesPage() {
  const showcase = await getMarketplaceCategoryShowcase();
  const heroImages = pickHeroFloatImages(showcase, ["homecare", "cosmetics", "wellness"]);
  const heroFloats = HERO_FLOAT_META.map((meta, i) => ({
    ...meta,
    image: heroImages[i],
    product: showcase.featured[meta.category],
  }));
  const ctaImage = pickCatalogImage(showcase);

  const categories = MARKETPLACE_CATEGORY_CARDS.map((card) => ({
    ...card,
    product: showcase.featured[card.value],
    image: showcase.featured[card.value]?.image,
  }));

  return (
    <MarketplacePageShell>
      <section className="relative isolate overflow-hidden rounded-[2.25rem] border border-white/60 bg-white/20 px-6 py-10 shadow-[0_24px_80px_rgba(94,70,135,0.16)] backdrop-blur-xl sm:px-10 lg:min-h-[420px]">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_78%_42%,rgba(255,255,255,0.72),transparent_26%),radial-gradient(circle_at_88%_38%,rgba(255,51,204,0.14),transparent_38%)]" />
        <div className="grid gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.12em] text-[#6ea43f]">
              Shop by category
            </p>
            <h1 className="mt-4 font-[family-name:var(--font-playfair-display)] text-4xl font-semibold leading-tight tracking-tight text-[#1e3157] sm:text-5xl lg:text-6xl">
              Home Care,
              <span className="block font-[family-name:var(--font-great-vibes)] text-5xl font-normal text-[#d965c9] sm:text-6xl">
                Cosmetics &amp; More
              </span>
            </h1>
            <div className="mt-4 flex items-center gap-2 text-[#6ea43f]">
              <span className="h-px w-10 bg-[#6ea43f]/70" />
              <Leaf className="h-4 w-4" aria-hidden />
              <span className="h-px w-10 bg-[#6ea43f]/70" />
            </div>
            <p className="mt-5 max-w-md text-base leading-7 text-[#1e3157]/82">
              Explore Home Care, Cosmetics, Health &amp; Wellness, and Perfumes &amp; Scents. Each
              card highlights a real product from that category in our shop.
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
            {heroFloats.map((card) => (
              <div
                key={card.category}
                className={`absolute ${card.position} overflow-hidden rounded-[1.75rem] border border-white/75 bg-white/60 p-2 shadow-[0_22px_60px_rgba(68,47,107,0.22)] backdrop-blur`}
              >
                {card.product ? (
                  <Link
                    href={`/product/${encodeURIComponent(card.product.slug)}`}
                    className="block"
                  >
                    <div className="relative h-[calc(100%-1.5rem)] min-h-[7rem] overflow-hidden rounded-[1.35rem]">
                      <MarketplaceFillImage
                        src={card.image}
                        alt={card.product.name}
                        sizes="(max-width: 768px) 140px, 180px"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#1e3157]/55 via-transparent to-transparent" />
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-center text-[10px] font-semibold text-[#1e3157]">
                      {card.label}
                    </p>
                  </Link>
                ) : (
                  <>
                    <div className="relative h-[calc(100%-1.5rem)] min-h-[7rem] overflow-hidden rounded-[1.35rem]">
                      <MarketplaceFillImage
                        src={card.image}
                        alt={card.label}
                        sizes="(max-width: 768px) 140px, 180px"
                      />
                    </div>
                    <p className="mt-1.5 text-center text-[10px] font-semibold text-[#1e3157]">
                      {card.label}
                    </p>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3 px-1">
          <div>
            <h2 className="font-[family-name:var(--font-playfair-display)] text-2xl font-semibold text-[#1e3157] sm:text-3xl">
              Browse categories
            </h2>
            <p className="mt-1 text-sm text-[#2A4C6A]/75">
              Four categories—each card links to the shop with that filter applied.
            </p>
          </div>
          <Button variant="outline" size="sm" className="rounded-xl border-white/80 bg-white/50" asChild>
            <Link href="/about-us">About our formulas</Link>
          </Button>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((category) => (
            <Link
              key={category.value}
              href={category.href}
              className="group flex flex-col overflow-hidden rounded-[1.75rem] border border-white/65 bg-white/50 shadow-[0_12px_40px_rgba(94,70,135,0.1)] backdrop-blur transition hover:-translate-y-1 hover:border-white hover:bg-white/75 hover:shadow-[0_22px_55px_rgba(94,70,135,0.18)]"
            >
              <div
                className={`relative aspect-[4/3] overflow-hidden bg-gradient-to-br ${category.accent}`}
              >
                <MarketplaceFillImage
                  src={category.image}
                  alt={category.product?.name ?? category.label}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  className="transition duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1e3157]/50 via-[#1e3157]/5 to-transparent" />
                <span
                  className={`absolute left-4 top-4 flex h-11 w-11 items-center justify-center rounded-full shadow-sm ${category.chip}`}
                >
                  <category.icon className="h-5 w-5" aria-hidden />
                </span>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <h3 className="font-[family-name:var(--font-playfair-display)] text-xl font-semibold text-[#3c2e60]">
                  {category.label}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-6 text-[#2A4C6A]/78">{category.description}</p>
                {category.product ? (
                  <p className="mt-2 text-xs font-medium text-[#6ea43f]">
                    Featured: {category.product.name}
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-[#2A4C6A]/60">
                    List a {marketplaceCategoryLabel(category.value)} product in the shop to
                    feature it here.
                  </p>
                )}
                <span className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#6ea43f]/12 px-3 py-2.5 text-sm font-semibold text-[#2B6B56] transition group-hover:bg-[#6ea43f]/20">
                  Shop {category.label}
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

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

      <section className="grid gap-5 overflow-hidden rounded-[2rem] border border-white/65 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="relative min-h-[240px] overflow-hidden lg:min-h-full">
          <MarketplaceFillImage
            src={ctaImage}
            alt={showcase.catalog?.name ?? "Products from our catalog"}
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
