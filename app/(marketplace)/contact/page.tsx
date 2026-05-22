import type { Metadata } from "next";
import Link from "next/link";
import { getPublicAppSettings } from "@/lib/services/appSettings.service";
import { getHeadOfficeBranchPublic } from "@/lib/services/branch.service";
import { getMarketplaceCategorySampleImages } from "@/lib/services/marketplace.service";
import { buildPageMetadata } from "@/lib/seo/site";
import {
  pickCatalogImage,
  pickHeroFloatImages,
} from "@/lib/marketplace/categoryImages";
import { MarketplaceFillImage } from "@/components/marketplace/MarketplaceFillImage";
import { MarketplaceFooter } from "@/components/marketplace/MarketplaceFooter";
import { MarketplacePageShell } from "@/components/marketplace/MarketplacePageShell";
import { ContactForm } from "@/components/marketplace/ContactForm";
import { Button } from "@/components/ui/button";
import {
  Heart,
  HelpCircle,
  Leaf,
  Mail,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  ShieldCheck,
  Store,
} from "lucide-react";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicAppSettings();
  return buildPageMetadata({
    title: "Contact",
    description: `Contact ${settings.appName} — questions, orders, and support.`,
    path: "/contact",
    settings,
  });
}

const HERO_FLOAT_META = [
  { label: "Skincare support", position: "left-[6%] top-[22%] h-44 w-32 -rotate-6 sm:left-[12%] sm:h-48 sm:w-36" },
  { label: "Product advice", position: "left-[38%] top-[6%] h-52 w-36 sm:left-[40%] sm:h-56 sm:w-40" },
  { label: "Order help", position: "right-[6%] top-[28%] h-40 w-36 rotate-6 sm:right-[10%] sm:h-44 sm:w-40" },
] as const;

const heroHighlights = [
  {
    label: "Response time",
    value: "Within 24 hours",
    icon: MessageCircle,
    tone: "bg-violet-100 text-violet-600",
  },
  {
    label: "Our promise",
    value: "Customer first",
    icon: Heart,
    tone: "bg-pink-100 text-pink-600",
  },
  {
    label: "Support",
    value: "Trusted help",
    icon: ShieldCheck,
    tone: "bg-emerald-100 text-emerald-600",
  },
] as const;

function mapsSearchUrl(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export default async function ContactPage() {
  const [settings, headOffice, samples] = await Promise.all([
    getPublicAppSettings(),
    getHeadOfficeBranchPublic(),
    getMarketplaceCategorySampleImages(),
  ]);
  const appName = settings.appName;
  const heroImages = pickHeroFloatImages(samples, ["homecare", "wellness", "scent"]);
  const heroFloats = HERO_FLOAT_META.map((meta, i) => ({ ...meta, image: heroImages[i] }));
  const mapImage = pickCatalogImage(samples);

  const addressLine = headOffice?.address?.trim();
  const phoneLine = headOffice?.phone?.trim();
  const emailLine = headOffice?.email?.trim();

  const contactInfo = [
    {
      title: headOffice?.name ? `${headOffice.name}` : "Our location",
      detail: addressLine ?? "Visit us at our head office—address available at checkout and order confirmations.",
      icon: MapPin,
      tone: "bg-violet-100 text-violet-600",
      href: addressLine ? mapsSearchUrl(addressLine) : undefined,
    },
    {
      title: "Phone",
      detail: phoneLine
        ? `${phoneLine}\nMon – Fri, 9AM – 6PM`
        : "Call during business hours—number on your order receipt.",
      icon: Phone,
      tone: "bg-pink-100 text-pink-600",
      href: phoneLine ? `tel:${phoneLine.replace(/\s/g, "")}` : undefined,
    },
    {
      title: "Email",
      detail: emailLine
        ? `${emailLine}\nWe reply within 24 hours`
        : "Send a message using the form—we respond within one business day.",
      icon: Mail,
      tone: "bg-emerald-100 text-emerald-600",
      href: emailLine ? `mailto:${emailLine}` : undefined,
    },
    {
      title: "Order help",
      detail: "Track orders, shipping, and returns in your account or our help pages.",
      icon: MessageCircle,
      tone: "bg-sky-100 text-sky-600",
      href: "/faqs",
    },
  ] as const;

  return (
    <MarketplacePageShell>
        {/* Hero */}
        <section className="relative isolate overflow-hidden rounded-[2.25rem] border border-white/60 bg-white/20 px-6 py-10 shadow-[0_24px_80px_rgba(94,70,135,0.16)] backdrop-blur-xl sm:px-10 lg:min-h-[420px]">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_76%_42%,rgba(255,255,255,0.75),transparent_26%),radial-gradient(circle_at_88%_38%,rgba(255,51,204,0.16),transparent_38%)]" />
          <div className="grid gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.12em] text-[#6ea43f]">
                Contact us
              </p>
              <h1 className="mt-4 font-[family-name:var(--font-playfair-display)] text-4xl font-semibold leading-tight tracking-tight text-[#1e3157] sm:text-5xl lg:text-6xl">
                We&apos;d love to
                <span className="block font-[family-name:var(--font-great-vibes)] text-5xl font-normal text-[#d965c9] sm:text-6xl">
                  hear from you!
                </span>
              </h1>
              <div className="mt-4 flex items-center gap-2 text-[#6ea43f]">
                <span className="h-px w-10 bg-[#6ea43f]/70" />
                <Leaf className="h-4 w-4" aria-hidden />
                <span className="h-px w-10 bg-[#6ea43f]/70" />
              </div>
              <p className="mt-5 max-w-md text-base leading-7 text-[#1e3157]/82">
                Questions about products, orders, or your routine? The {appName} team is here to help
                you shop with confidence.
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
                <Link href="/faqs">Browse FAQs</Link>
              </Button>
            </div>

            <div className="relative min-h-[300px] sm:min-h-[340px] lg:min-h-[370px]">
              <div className="absolute inset-x-[6%] bottom-8 h-20 rounded-[50%] bg-white/45 blur-2xl" />
              <div className="absolute left-[26%] top-[8%] h-60 w-60 rounded-full border border-white/55 bg-white/15" />

              {heroFloats.map((card) => (
                <div
                  key={card.label}
                  className={`absolute ${card.position} overflow-hidden rounded-[1.75rem] border border-white/75 bg-white/60 p-2 shadow-[0_22px_60px_rgba(68,47,107,0.22)] backdrop-blur`}
                >
                  <div className="relative h-[calc(100%-1.5rem)] min-h-[7rem] overflow-hidden rounded-[1.35rem]">
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
            </div>
          </div>
        </section>

        {/* Form + info + map */}
        <section className="grid gap-6 rounded-[2rem] border border-white/65 bg-white/50 p-5 shadow-[0_18px_55px_rgba(94,70,135,0.14)] backdrop-blur-xl sm:p-8 lg:grid-cols-3 lg:gap-8">
          <div className="lg:col-span-1">
            <div className="mb-4 flex items-center gap-2">
              <Leaf className="h-4 w-4 text-[#6ea43f]" aria-hidden />
              <h2 className="font-[family-name:var(--font-playfair-display)] text-2xl font-semibold text-[#1e3157]">
                Send a message
              </h2>
            </div>
            <p className="text-sm leading-6 text-[#2A4C6A]/72">
              Fill out the form and we&apos;ll get back to you as soon as possible.
            </p>
            <ContactForm />
          </div>

          <div className="lg:col-span-1">
            <div className="mb-4 flex items-center gap-2">
              <Leaf className="h-4 w-4 text-[#6ea43f]" aria-hidden />
              <h2 className="font-[family-name:var(--font-playfair-display)] text-2xl font-semibold text-[#1e3157]">
                Contact information
              </h2>
            </div>
            <div className="space-y-4">
              {contactInfo.map((item) => {
                const body = (
                  <article className="flex gap-3 rounded-2xl border border-transparent p-2 transition hover:border-white/70 hover:bg-white/45">
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${item.tone}`}
                    >
                      <item.icon className="h-5 w-5" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-[#1e3157]">{item.title}</h3>
                      <p className="mt-1 whitespace-pre-line text-xs leading-5 text-[#2A4C6A]/75">
                        {item.detail}
                      </p>
                    </div>
                  </article>
                );
                if (item.href) {
                  const external = item.href.startsWith("http");
                  return (
                    <Link
                      key={item.title}
                      href={item.href}
                      className="block rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6ea43f]"
                      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    >
                      {body}
                    </Link>
                  );
                }
                return <div key={item.title}>{body}</div>;
              })}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="mb-4 flex items-center gap-2">
              <Leaf className="h-4 w-4 text-[#6ea43f]" aria-hidden />
              <h2 className="font-[family-name:var(--font-playfair-display)] text-2xl font-semibold text-[#1e3157]">
                Find us
              </h2>
            </div>
            <div className="relative h-48 overflow-hidden rounded-2xl border border-white/65 sm:h-56">
              <MarketplaceFillImage
                src={mapImage}
                alt="Products from our shop"
                sizes="(max-width: 1024px) 100vw, 400px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1e3157]/50 via-white/10 to-white/20" />
              <span className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-violet-500 text-white shadow-[0_16px_35px_rgba(124,58,237,0.32)]">
                <MapPin className="h-7 w-7" aria-hidden />
              </span>
            </div>
            <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-white/65 bg-white/45 p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600">
                  <Store className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-semibold text-[#1e3157]">
                    {headOffice?.name ?? "Shop online"}
                  </p>
                  <p className="text-xs leading-5 text-[#2A4C6A]/72">
                    {addressLine
                      ? "Open in maps for directions to our head office."
                      : `Browse ${appName} and order for delivery nationwide.`}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {addressLine ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl border-white/70 bg-white/65"
                    asChild
                  >
                    <a href={mapsSearchUrl(addressLine)} target="_blank" rel="noopener noreferrer">
                      Get directions
                    </a>
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  className="rounded-xl bg-gradient-to-r from-[#6ea43f] to-[#477d34] text-white"
                  asChild
                >
                  <Link href="/shop">Shop now</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Quick help */}
        <section className="flex flex-col gap-4 rounded-[2rem] border border-white/60 bg-[#f6def8]/55 p-6 shadow-[0_14px_45px_rgba(94,70,135,0.12)] backdrop-blur-xl sm:flex-row sm:items-center">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600">
            <HelpCircle className="h-7 w-7" aria-hidden />
          </span>
          <div className="flex-1">
            <h2 className="font-[family-name:var(--font-playfair-display)] text-xl font-semibold text-[#1e3157]">
              Before you write
            </h2>
            <p className="mt-1 text-sm leading-6 text-[#2A4C6A]/72">
              Many answers are in our help pages—shipping times, returns, and how to place an order.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:shrink-0">
            <Button variant="outline" size="sm" className="rounded-xl border-white/80 bg-white/60" asChild>
              <Link href="/shipping-delivery">
                <Package className="mr-1.5 h-4 w-4" aria-hidden />
                Shipping
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="rounded-xl border-white/80 bg-white/60" asChild>
              <Link href="/returns-refunds">Returns</Link>
            </Button>
            <Button
              size="sm"
              className="rounded-xl bg-gradient-to-r from-[#6ea43f] to-[#477d34] text-white"
              asChild
            >
              <Link href="/faqs">FAQs</Link>
            </Button>
          </div>
        </section>

        <MarketplaceFooter />
    </MarketplacePageShell>
  );
}
