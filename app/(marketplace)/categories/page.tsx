import Link from "next/link";
import {
  ArrowRight,
  Beaker,
  Droplets,
  Heart,
  Home,
  Leaf,
  PackageCheck,
  ShieldCheck,
  Sparkles,
  Sprout,
} from "lucide-react";
import { AppLogo } from "@/components/branding/AppLogo";
import { Button } from "@/components/ui/button";

const categories = [
  {
    title: "Cleansers",
    count: 12,
    description: "Deep cleanse and refresh your skin.",
    icon: Droplets,
    href: "/shop",
    accent: "bg-blue-100 text-blue-600",
    art: "from-blue-100 via-white to-sky-100",
    product: "Botanical Glow Cleanser",
  },
  {
    title: "Toners",
    count: 10,
    description: "Balance, hydrate and prep your skin.",
    icon: Beaker,
    href: "/shop",
    accent: "bg-violet-100 text-violet-600",
    art: "from-violet-100 via-white to-purple-100",
    product: "Mild Exfoliating Toner",
  },
  {
    title: "Serums",
    count: 15,
    description: "Target concerns and nourish deeply.",
    icon: Sparkles,
    href: "/shop",
    accent: "bg-pink-100 text-pink-600",
    art: "from-pink-100 via-white to-rose-100",
    product: "Radiance Serum",
  },
  {
    title: "Moisturizers",
    count: 12,
    description: "Hydrate, protect and lock in moisture.",
    icon: PackageCheck,
    href: "/shop",
    accent: "bg-emerald-100 text-emerald-600",
    art: "from-emerald-100 via-white to-lime-100",
    product: "Ultra Light Moisturizer",
  },
  {
    title: "Soaps & Bars",
    count: 8,
    description: "Gentle cleanse with natural care.",
    icon: Home,
    href: "/shop",
    accent: "bg-orange-100 text-orange-600",
    art: "from-orange-100 via-white to-amber-100",
    product: "Kojic Glow Bar",
  },
  {
    title: "All Products",
    count: 57,
    description: "Explore our complete skincare range.",
    icon: Sparkles,
    href: "/shop",
    accent: "bg-purple-100 text-purple-600",
    art: "from-purple-100 via-white to-fuchsia-100",
    product: "Glowish Collection",
  },
];

const benefits = [
  {
    title: "Natural Ingredients",
    description: "Made with nature's finest ingredients",
    icon: Leaf,
  },
  {
    title: "Dermatologically Tested",
    description: "Clinically tested for all skin types",
    icon: Beaker,
  },
  {
    title: "Cruelty Free",
    description: "We never test on animals",
    icon: Heart,
  },
  {
    title: "Safe & Effective",
    description: "Gentle yet effective formulas",
    icon: ShieldCheck,
  },
  {
    title: "Sustainable Beauty",
    description: "Kind to your skin and the planet",
    icon: Sprout,
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

export default function CategoriesPage() {
  return (
    <div className="-mx-4 -my-8 min-h-full px-4 py-8 text-[#2A4C6A]">
      <div className="mx-auto max-w-7xl space-y-5">
        <section className="relative isolate overflow-hidden rounded-[2rem] border border-white/60 bg-white/25 px-6 py-8 shadow-[0_24px_80px_rgba(94,70,135,0.18)] backdrop-blur-xl sm:px-10 lg:min-h-[280px]">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_72%_40%,rgba(255,255,255,0.7),transparent_24%),radial-gradient(circle_at_82%_48%,rgba(255,51,204,0.14),transparent_34%)]" />
          <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
            <div>
              <h1 className="font-serif text-4xl font-semibold tracking-tight text-[#1e3157] sm:text-5xl">
                Categories
              </h1>
              <div className="mt-3 flex items-center gap-2 text-[#6ea43f]">
                <span className="h-px w-12 bg-[#6ea43f]" />
                <Leaf className="h-4 w-4" />
                <span className="h-px w-12 bg-[#6ea43f]" />
              </div>
              <p className="mt-5 max-w-md text-base leading-7 text-[#2A4C6A]/85">
                Explore our wide range of premium skincare categories for healthy, radiant &
                glowing skin.
              </p>
            </div>

            <div className="relative min-h-[210px]">
              <div className="absolute inset-x-[8%] top-[20%] h-24 rounded-full border border-white/50 bg-white/25 blur-[1px]" />
              <div className="absolute inset-x-[5%] bottom-2 h-14 rounded-[50%] bg-white/35 blur-2xl" />
              {["left-[18%] top-[18%] h-40 w-24 rotate-[-4deg]", "left-[44%] top-[2%] h-48 w-28", "right-[18%] top-[28%] h-36 w-28 rotate-[5deg]"].map((pos, index) => (
                <div
                  key={pos}
                  className={`absolute ${pos} overflow-hidden rounded-3xl border border-white/70 bg-white/55 p-3 shadow-[0_20px_55px_rgba(68,47,107,0.2)] backdrop-blur`}
                >
                  <div className="flex h-full items-center justify-center rounded-2xl bg-gradient-to-br from-white/80 to-pink-100/70">
                    {index === 0 ? (
                      <Droplets className="h-12 w-12 text-[#6ea43f]" />
                    ) : index === 1 ? (
                      <Sparkles className="h-12 w-12 text-[#6ea43f]" />
                    ) : (
                      <PackageCheck className="h-12 w-12 text-[#6ea43f]" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {categories.map((category) => (
            <Link
              key={category.title}
              href={category.href}
              className="group overflow-hidden rounded-3xl border border-white/65 bg-white/45 p-4 shadow-sm backdrop-blur transition hover:-translate-y-1 hover:bg-white/70 hover:shadow-[0_20px_55px_rgba(94,70,135,0.18)]"
            >
              <div className={`relative mb-4 aspect-[1.22] overflow-hidden rounded-2xl bg-gradient-to-br ${category.art}`}>
                <span className={`absolute left-3 top-3 flex h-12 w-12 items-center justify-center rounded-full ${category.accent}`}>
                  <category.icon className="h-6 w-6" />
                </span>
                <div className="absolute inset-x-5 bottom-5 rounded-[50%] bg-white/60 blur-xl" />
                <div className="absolute bottom-3 right-3 flex h-24 w-20 items-center justify-center rounded-2xl border border-white/70 bg-white/60 shadow-sm transition group-hover:scale-105">
                  <category.icon className="h-10 w-10 text-[#6ea43f]" />
                </div>
              </div>
              <h2 className="font-serif text-xl font-semibold text-[#3c2e60]">{category.title}</h2>
              <p className="mt-1 text-sm leading-5 text-[#2A4C6A]/75">{category.description}</p>
              <p className="mt-1 text-xs font-semibold text-[#6ea43f]">
                {category.count} Products · {category.product}
              </p>
              <span className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-violet-100/75 px-3 py-2 text-xs font-semibold text-violet-700 transition group-hover:bg-violet-200">
                Shop Now
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </span>
            </Link>
          ))}
        </section>

        <section className="grid gap-3 rounded-[2rem] border border-white/60 bg-white/45 p-5 shadow-[0_14px_40px_rgba(94,70,135,0.12)] backdrop-blur-xl md:grid-cols-5">
          {benefits.map((benefit) => (
            <article key={benefit.title} className="flex items-center gap-3 border-white/50 md:border-r md:last:border-r-0">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/65 text-[#6ea43f]">
                <benefit.icon className="h-6 w-6" />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-[#3c2e60]">{benefit.title}</h3>
                <p className="mt-1 text-xs leading-5 text-[#2A4C6A]/70">{benefit.description}</p>
              </div>
            </article>
          ))}
        </section>

        <footer className="overflow-hidden rounded-[2rem] border border-white/60 bg-[#f6def8]/55 shadow-[0_18px_60px_rgba(94,70,135,0.16)] backdrop-blur-xl">
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
                <h3 className="font-semibold text-[#3c2e60]">{column.title}</h3>
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
