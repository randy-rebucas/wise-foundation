import Link from "next/link";
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
import { AppLogo } from "@/components/branding/AppLogo";
import { Button } from "@/components/ui/button";

const heroHighlights = [
  {
    title: "Natural Ingredients",
    description: "Carefully selected from the best nature has to offer.",
    icon: Leaf,
  },
  {
    title: "Clinically Tested",
    description: "Safe, effective and tested for all skin types.",
    icon: Beaker,
  },
];

const promises = [
  {
    title: "Clean & Safe",
    description: "No harsh chemicals, only skin-loving care.",
    icon: Leaf,
    tone: "bg-emerald-100 text-emerald-600",
  },
  {
    title: "Effective Results",
    description: "Formulated to deliver visible, healthy glow.",
    icon: Droplets,
    tone: "bg-blue-100 text-blue-600",
  },
  {
    title: "For Every Skin",
    description: "Gentle and suitable for all skin types.",
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
];

const footerColumns = [
  {
    title: "Shop",
    links: ["All Products", "Best Sellers", "New Arrivals", "Sale"],
  },
  {
    title: "Help",
    links: ["FAQs", "Shipping & Delivery", "Returns & Refunds", "Contact Us"],
  },
  {
    title: "Company",
    links: ["About Us", "Our Ingredients", "Reviews", "Privacy Policy"],
  },
];

const stockImages = {
  cleanser:
    "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=700&q=80",
  serum:
    "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=700&q=80",
  productSet:
    "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=700&q=80",
  model:
    "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=900&q=80",
};

const heroProductCards = [
  {
    image: stockImages.cleanser,
    label: "Clean botanical care",
    position: "left-[18%] top-[22%] h-48 w-36 rotate-[-5deg]",
  },
  {
    image: stockImages.serum,
    label: "Daily glow essentials",
    position: "left-[40%] top-[8%] h-56 w-40",
  },
  {
    image: stockImages.productSet,
    label: "Pure skincare rituals",
    position: "right-[8%] top-[28%] h-44 w-40 rotate-[4deg]",
  },
];

export default function AboutUsPage() {
  return (
    <div className="-mx-4 -my-8 min-h-full px-4 py-8 font-[family-name:var(--font-plus-jakarta-sans)] text-[#2A4C6A]">
      <div className="mx-auto max-w-7xl space-y-5">
        <section className="relative isolate overflow-hidden rounded-[2.25rem] border border-white/60 bg-white/20 px-6 py-10 shadow-[0_24px_80px_rgba(94,70,135,0.16)] backdrop-blur-xl sm:px-10 lg:min-h-[470px]">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_78%_44%,rgba(255,255,255,0.72),transparent_24%),radial-gradient(circle_at_88%_36%,rgba(255,51,204,0.16),transparent_36%)]" />
          <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.12em] text-[#6ea43f]">
                About Glowish
              </p>
              <h1 className="mt-4 font-[family-name:var(--font-playfair-display)] text-4xl font-semibold leading-tight tracking-tight text-[#1e3157] sm:text-5xl lg:text-6xl">
                Naturally Beautiful,
                <span className="block font-[family-name:var(--font-great-vibes)] text-[#d965c9]">
                  Confidently You.
                </span>
              </h1>
              <p className="mt-6 max-w-md text-base leading-7 text-[#1e3157]/82">
                At Glowish, we believe glowing skin starts with the right care and pure
                ingredients. Our mission is to help you feel confident in your skin every day.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {heroHighlights.map((item) => (
                  <article key={item.title} className="flex items-center gap-3 border-white/50 sm:border-r sm:last:border-r-0">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/55 text-[#6ea43f] shadow-sm">
                      <item.icon className="h-6 w-6" />
                    </span>
                    <div>
                  <h2 className="font-[family-name:var(--font-playfair-display)] text-base font-semibold text-[#1e3157]">
                    {item.title}
                  </h2>
                      <p className="mt-1 text-xs leading-5 text-[#2A4C6A]/75">{item.description}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className="relative min-h-[330px] lg:min-h-[400px]">
              <div className="absolute inset-x-[5%] bottom-10 h-28 rounded-[50%] bg-white/45 blur-2xl" />
              <div className="absolute left-[22%] top-[6%] h-72 w-72 rounded-full border border-white/55 bg-white/20" />
              <div className="absolute left-[4%] bottom-11 h-28 w-16 rounded-full bg-violet-200/65 blur-sm" />
              <div className="absolute bottom-10 left-[12%] h-12 w-12 rounded-full bg-white/80 shadow-sm" />
              <div className="absolute bottom-6 right-[4%] h-28 w-28 rounded-full bg-pink-300/40 blur-sm" />

              {heroProductCards.map((card) => (
                <div
                  key={card.label}
                  className={`absolute ${card.position} overflow-hidden rounded-[2rem] border border-white/75 bg-white/65 p-2 shadow-[0_24px_65px_rgba(68,47,107,0.22)] backdrop-blur`}
                >
                  <div
                    className="relative h-full rounded-[1.4rem] bg-cover bg-center"
                    style={{ backgroundImage: `url(${card.image})` }}
                  >
                    <div className="absolute inset-0 rounded-[1.4rem] bg-gradient-to-t from-white/85 via-white/10 to-transparent" />
                    <span className="absolute bottom-3 left-3 right-3 text-center text-[10px] font-semibold text-[#1e3157]">
                      {card.label}
                    </span>
                  </div>
                </div>
              ))}

              <div className="absolute bottom-5 left-[45%] w-40 rounded-3xl border border-white/75 bg-white/70 p-4 shadow-[0_20px_55px_rgba(68,47,107,0.18)]">
                <PackageCheck className="mx-auto h-10 w-10 text-[#6ea43f]" />
                <p className="mt-2 text-center text-xs font-semibold text-[#1e3157]">
                  Gentle skincare essentials
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/65 bg-white/50 p-6 shadow-[0_18px_55px_rgba(94,70,135,0.14)] backdrop-blur-xl">
          <div className="mb-6 flex items-center justify-center gap-3 text-center">
            <Leaf className="h-5 w-5 text-[#6ea43f]" />
            <h2 className="font-[family-name:var(--font-playfair-display)] text-3xl font-semibold text-[#1e3157]">
              Our Promise to You
            </h2>
            <Leaf className="h-5 w-5 text-[#6ea43f]" />
          </div>
          <div className="grid gap-4 md:grid-cols-5">
            {promises.map((promise) => (
              <article key={promise.title} className="flex items-center gap-3 border-white/60 md:border-r md:last:border-r-0">
                <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${promise.tone}`}>
                  <promise.icon className="h-7 w-7" />
                </span>
                <div>
                  <h3 className="font-[family-name:var(--font-playfair-display)] text-base font-semibold text-[#1e3157]">
                    {promise.title}
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-[#2A4C6A]/72">{promise.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div
            className="relative min-h-[250px] overflow-hidden rounded-[2rem] border border-white/65 bg-cover bg-center shadow-sm backdrop-blur"
            style={{ backgroundImage: `url(${stockImages.model})` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/5 via-pink-100/20 to-white/55" />
            <Sparkles className="absolute right-12 top-12 h-10 w-10 text-[#d965c9]" />
          </div>

          <article className="rounded-[2rem] border border-white/65 bg-white/40 p-8 shadow-sm backdrop-blur">
            <p className="text-sm font-bold uppercase tracking-[0.12em] text-[#6ea43f]">
              Our Story
            </p>
            <h2 className="mt-3 font-[family-name:var(--font-playfair-display)] text-4xl font-semibold text-[#1e3157]">
              From Nature,
              <span className="block font-[family-name:var(--font-great-vibes)] text-[#d965c9]">
                For You
              </span>
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[#2A4C6A]/78">
              Glowish was born from a simple belief: skincare should be pure, effective, and
              accessible to everyone. Inspired by nature and backed by science, we create
              products that bring out your natural glow and celebrate your unique beauty.
            </p>
            <Button className="mt-6 rounded-xl bg-gradient-to-r from-[#6ea43f] to-[#477d34] text-white" asChild>
              <Link href="/shop">
                Learn More About Our Journey
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </article>
        </section>

        <footer className="overflow-hidden rounded-[2rem] border border-white/60 bg-white/45 shadow-[0_18px_60px_rgba(94,70,135,0.14)] backdrop-blur-xl">
          <div className="grid gap-6 border-b border-white/55 p-5 sm:p-7 md:grid-cols-[1.2fr_1fr_1fr_1fr]">
            <div className="space-y-4">
              <AppLogo size="lg" />
              <p className="max-w-xs text-sm leading-6 text-[#2A4C6A]/75">
                Glow naturally, wish beautifully. Premium skincare for your radiant confidence.
              </p>
              <div className="flex gap-2">
                {[Heart, Sparkles, Leaf, ShieldCheck].map((Icon, index) => (
                  <span key={index} className="flex h-8 w-8 items-center justify-center rounded-full bg-[#6ea43f] text-white">
                    <Icon className="h-4 w-4" />
                  </span>
                ))}
              </div>
            </div>
            {footerColumns.map((column) => (
              <div key={column.title}>
                <h3 className="font-[family-name:var(--font-playfair-display)] text-lg font-semibold text-[#3c2e60]">
                  {column.title}
                </h3>
                <ul className="mt-4 space-y-2 text-sm text-[#2A4C6A]/75">
                  {column.links.map((link) => (
                    <li key={link}>{link}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2 px-5 py-4 text-center text-xs text-[#2A4C6A]/65 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <span>© {new Date().getFullYear()} Glowish. All rights reserved.</span>
            <span>
              Made with <span className="text-[#FF33CC]">♥</span> for your glow.
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
