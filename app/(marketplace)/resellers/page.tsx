import type { Metadata } from "next";
import Link from "next/link";
import { getPublicAppSettings } from "@/lib/services/appSettings.service";
import { getMarketplaceCategorySampleImages } from "@/lib/services/marketplace.service";
import { buildPageMetadata } from "@/lib/seo/site";
import { pickHeroFloatImages } from "@/lib/marketplace/categoryImages";
import { MarketplaceFillImage } from "@/components/marketplace/MarketplaceFillImage";
import { MarketplaceFooter } from "@/components/marketplace/MarketplaceFooter";
import { ContactForm } from "@/components/marketplace/ContactForm";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Gift,
  Handshake,
  Leaf,
  Megaphone,
  Package,
  Percent,
  Truck,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  MARKETPLACE_PAGE_FONT,
  MARKETPLACE_PAGE_INNER,
  MARKETPLACE_PAGE_OUTER,
} from "@/lib/marketplace/pageLayout";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicAppSettings();
  return buildPageMetadata({
    title: "Become a Reseller",
    description: `Partner with ${settings.appName} — earn commissions, get marketing support, and grow your own skincare business.`,
    path: "/resellers",
    settings,
  });
}

const HERO_FLOAT_META = [
  { label: "Wholesale pricing", position: "left-[4%] top-[16%] h-56 w-40 -rotate-6 sm:left-[10%] sm:h-64 sm:w-44" },
  { label: "Ready-to-sell kits", position: "left-[36%] top-[16%] h-56 w-40 sm:h-64 sm:w-44" },
  { label: "Marketing support", position: "right-[3%] top-[16%] h-56 w-40 rotate-6 sm:right-[10%] sm:h-64 sm:w-44" },
] as const;

const BENEFITS = [
  {
    title: "Earn commissions",
    description: "Competitive margins on every sale, with bonus payouts as you grow.",
    icon: Percent,
    tone: "bg-emerald-100 text-emerald-600",
  },
  {
    title: "Marketing support",
    description: "Ready-made photos, captions, and promos to help you sell faster.",
    icon: Megaphone,
    tone: "bg-orange-100 text-orange-600",
  },
  {
    title: "Reliable fulfillment",
    description: "We handle sourcing and shipping so you can focus on selling.",
    icon: Truck,
    tone: "bg-blue-100 text-blue-600",
  },
  {
    title: "Community & training",
    description: "Onboarding guidance and a community of fellow resellers.",
    icon: Users,
    tone: "bg-pink-100 text-pink-600",
  },
] as const;

const STEPS = [
  {
    title: "Apply",
    description: "Tell us a bit about yourself and how you plan to sell.",
    icon: Handshake,
  },
  {
    title: "Get approved",
    description: "Our team reviews your application and reaches out with next steps.",
    icon: Gift,
  },
  {
    title: "Start earning",
    description: "Order stock or share your link, and start earning on every sale.",
    icon: Package,
  },
] as const;

export default async function ResellersPage() {
  const settings = await getPublicAppSettings();
  const appName = settings.appName;
  const samples = await getMarketplaceCategorySampleImages();
  const heroImages = pickHeroFloatImages(samples, ["homecare", "cosmetics", "wellness"]);
  const heroFloats = HERO_FLOAT_META.map((meta, i) => ({ ...meta, image: heroImages[i] }));

  return (
    <div className={cn(MARKETPLACE_PAGE_OUTER, MARKETPLACE_PAGE_FONT, "pt-0 pb-0")}>
      <div className="-mx-4">
        {/* Hero */}
        <section className="relative isolate overflow-hidden bg-white/20 px-6 py-10 shadow-[0_24px_80px_rgba(70,90,58,0.16)] backdrop-blur-xl sm:px-10 lg:min-h-[460px]">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_78%_42%,rgba(255,255,255,0.72),transparent_26%),radial-gradient(circle_at_88%_38%,rgba(247,153,33,0.14),transparent_38%)]" />
          <div className={cn(MARKETPLACE_PAGE_INNER, "grid gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:items-center")}>
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.12em] text-[#6ea43f]">
                Reseller program
              </p>
              <h1 className="mt-4 font-[family-name:var(--font-yellowtail)] text-5xl font-normal leading-tight text-[#2B6B56] sm:text-6xl lg:text-7xl">
                Sell {appName},
                <span className="block font-[family-name:var(--font-yellowtail)] text-5xl font-normal text-[#F79921] sm:text-6xl lg:text-7xl">
                  Grow With Us
                </span>
              </h1>
              <div className="mt-4 flex items-center gap-2 text-[#6ea43f]">
                <span className="h-px w-10 bg-[#6ea43f]/70" />
                <Leaf className="h-4 w-4" aria-hidden />
                <span className="h-px w-10 bg-[#6ea43f]/70" />
              </div>
              <p className="mt-5 max-w-md text-base leading-7 text-[#1e3157]/82">
                Turn your love for {appName} into a business. Join our reseller program for
                wholesale pricing, marketing support, and a community that grows with you.
              </p>
              <Button
                className="mt-8 rounded-[10px] bg-gradient-to-r from-[#6ea43f] to-[#477d34] text-white shadow-md hover:opacity-95"
                asChild
              >
                <Link href="#apply">
                  Apply now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="relative min-h-[340px] sm:min-h-[380px] lg:min-h-[410px]">
              <div className="absolute inset-x-[6%] bottom-8 h-20 rounded-[50%] bg-white/45 blur-2xl" />
              <div className="absolute left-[26%] top-[8%] h-60 w-60 rounded-full border border-white/55 bg-white/15" />

              {heroFloats.map((card) => (
                <div
                  key={card.label}
                  className={`absolute ${card.position} overflow-hidden rounded-[10px] border border-white/75 bg-white/60 p-2 shadow-[0_22px_60px_rgba(53,68,44,0.22)] backdrop-blur`}
                >
                  <div className="relative h-[calc(100%-1.5rem)] min-h-[7rem] overflow-hidden rounded-[10px]">
                    <MarketplaceFillImage
                      src={card.image}
                      alt={card.label}
                      sizes="(max-width: 768px) 170px, 220px"
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
      </div>

      <div className={cn(MARKETPLACE_PAGE_INNER, "mt-6 space-y-6")}>
        {/* Benefits */}
        <section className="rounded-[10px] border border-white/65 bg-white/50 p-6 shadow-[0_18px_55px_rgba(70,90,58,0.14)] backdrop-blur-xl sm:p-8">
          <div className="mb-6 flex items-center justify-center gap-3 text-center">
            <Leaf className="h-5 w-5 text-[#6ea43f]" aria-hidden />
            <h2 className="font-[family-name:var(--font-yellowtail)] text-2xl font-normal text-[#1e3157] sm:text-3xl">
              Why sell with us
            </h2>
            <Leaf className="h-5 w-5 text-[#6ea43f]" aria-hidden />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {BENEFITS.map((benefit) => (
              <article
                key={benefit.title}
                className="flex items-start gap-3 rounded-[10px] border border-white/60 bg-white/40 p-4 lg:border-r lg:last:border-r-0"
              >
                <span
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${benefit.tone}`}
                >
                  <benefit.icon className="h-6 w-6" aria-hidden />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-[#1e3157]">{benefit.title}</h3>
                  <p className="mt-1 text-xs leading-5 text-[#2A4C6A]/72">{benefit.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="rounded-[10px] border border-white/60 bg-gradient-to-br from-[#FBE9BF]/40 to-white/40 p-6 shadow-[0_18px_55px_rgba(70,90,58,0.14)] backdrop-blur-xl sm:p-8">
          <div className="mb-6 flex items-center justify-center gap-3 text-center">
            <Handshake className="h-5 w-5 text-[#859d6e]" aria-hidden />
            <h2 className="font-[family-name:var(--font-yellowtail)] text-2xl font-normal text-[#1e3157] sm:text-3xl">
              How it works
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {STEPS.map((step, index) => (
              <article key={step.title} className="flex flex-col items-center text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#6ea43f] text-white shadow-sm">
                  <step.icon className="h-6 w-6" aria-hidden />
                </span>
                <p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-[#6ea43f]">
                  Step {index + 1}
                </p>
                <h3 className="mt-1 font-[family-name:var(--font-playfair-display)] text-lg font-semibold text-[#1e3157]">
                  {step.title}
                </h3>
                <p className="mt-1 max-w-xs text-sm leading-6 text-[#2A4C6A]/75">
                  {step.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* Apply */}
        <section
          id="apply"
          className="grid gap-6 rounded-[10px] border border-white/65 bg-white/50 p-5 shadow-[0_18px_55px_rgba(70,90,58,0.14)] backdrop-blur-xl sm:p-8 lg:grid-cols-2 lg:gap-10"
        >
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.12em] text-[#6ea43f]">
              Ready to join?
            </p>
            <h2 className="mt-3 font-[family-name:var(--font-yellowtail)] text-3xl font-normal text-[#1e3157] sm:text-4xl">
              Apply to become a reseller
            </h2>
            <p className="mt-4 max-w-md text-sm leading-7 text-[#2A4C6A]/78">
              Send us a message using the form and mention that you&apos;d like to join the
              reseller program. Include your location and how you plan to sell—our team will
              follow up with next steps.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button variant="outline" className="rounded-[10px] border-white/80 bg-white/60" asChild>
                <Link href="/faqs">Read our FAQs</Link>
              </Button>
              <Button variant="outline" className="rounded-[10px] border-white/80 bg-white/60" asChild>
                <Link href="/contact">Contact us directly</Link>
              </Button>
            </div>
          </div>
          <div>
            <ContactForm />
          </div>
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
