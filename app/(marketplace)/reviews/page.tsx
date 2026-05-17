import Link from "next/link";
import {
  BadgeCheck,
  Heart,
  Leaf,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Star,
} from "lucide-react";
import { AppLogo } from "@/components/branding/AppLogo";
import { Button } from "@/components/ui/button";

const stockImages = {
  productOne:
    "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=700&q=80",
  productTwo:
    "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=700&q=80",
  productThree:
    "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=700&q=80",
  avatarOne:
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80",
  avatarTwo:
    "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80",
  avatarThree:
    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80",
  avatarFour:
    "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?auto=format&fit=crop&w=200&q=80",
  avatarFive:
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80",
  avatarSix:
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
  avatarSeven:
    "https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?auto=format&fit=crop&w=200&q=80",
  avatarEight:
    "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80",
};

const stats = [
  { label: "Overall Rating", value: "4.9/5", icon: Star, tone: "text-pink-500" },
  { label: "Happy Customers", value: "12,500+", icon: BadgeCheck, tone: "text-emerald-500" },
  { label: "Reviews", value: "18,300+", icon: MessageCircle, tone: "text-violet-500" },
];

const filters = [
  "All Reviews (18,300)",
  "With Photos (4,230)",
  "5 Stars (16,200)",
  "4 Stars (1,780)",
  "3 Stars (210)",
  "2 Stars (70)",
  "1 Star (40)",
];

const reviews = [
  {
    name: "Angelica D.",
    date: "2 days ago",
    text: "Glowish products transformed my skin. It feels so fresh, soft and glowing every day. Absolutely love the toner and serum!",
    product: "Radiance Serum & Mild Toner",
    image: stockImages.productOne,
    avatar: stockImages.avatarOne,
  },
  {
    name: "Rhealyn M.",
    date: "5 days ago",
    text: "The exfoliating bar is amazing! My skin is smoother and brighter. Highly recommend Glowish to everyone.",
    product: "Exfoliating Kojic Bar",
    image: stockImages.productThree,
    avatar: stockImages.avatarTwo,
  },
  {
    name: "Lara C.",
    date: "1 week ago",
    text: "Finally found skincare that suits my skin. Natural, effective and worth every penny!",
    product: "Ultra Light Moisturizer",
    image: stockImages.productTwo,
    avatar: stockImages.avatarThree,
  },
  {
    name: "Mikaela T.",
    date: "1 week ago",
    text: "Love how gentle yet effective Glowish products are. My skin looks healthier and more radiant now.",
    product: "Vitamin C Brightening Serum",
    image: stockImages.productOne,
    avatar: stockImages.avatarFour,
  },
  {
    name: "James R.",
    date: "2 weeks ago",
    text: "Great quality and visible results. My skin feels clean, hydrated and refreshed.",
    product: "Botanical Glow Cleanser",
    image: stockImages.productTwo,
    avatar: stockImages.avatarFive,
  },
  {
    name: "Sophie L.",
    date: "2 weeks ago",
    text: "I have sensitive skin and Glowish works perfectly for me. No irritation at all!",
    product: "Calming Night Cream",
    image: stockImages.productThree,
    avatar: stockImages.avatarSix,
  },
  {
    name: "Patricia W.",
    date: "3 weeks ago",
    text: "The combination of natural ingredients and science really shows. My glow up journey started with Glowish!",
    product: "Rose Hydrating Toner",
    image: stockImages.productOne,
    avatar: stockImages.avatarSeven,
  },
  {
    name: "Kevin D.",
    date: "1 month ago",
    text: "Fast delivery and premium packaging. Very happy with the products.",
    product: "Gentle Foaming Cleanser",
    image: stockImages.productTwo,
    avatar: stockImages.avatarEight,
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

export default function ReviewsPage() {
  return (
    <div className="-mx-4 -my-8 min-h-full px-4 py-8 font-[family-name:var(--font-plus-jakarta-sans)] text-[#2A4C6A]">
      <div className="mx-auto max-w-7xl space-y-5">
        <section className="relative isolate overflow-hidden rounded-[2.25rem] border border-white/60 bg-white/20 px-6 py-10 shadow-[0_24px_80px_rgba(94,70,135,0.16)] backdrop-blur-xl sm:px-10 lg:min-h-[420px]">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_76%_44%,rgba(255,255,255,0.75),transparent_24%),radial-gradient(circle_at_88%_36%,rgba(255,51,204,0.16),transparent_36%)]" />
          <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.12em] text-[#6ea43f]">
                Reviews
              </p>
              <h1 className="mt-4 font-[family-name:var(--font-playfair-display)] text-4xl font-semibold leading-tight tracking-tight text-[#1e3157] sm:text-5xl lg:text-6xl">
                Loved by Thousands,
                <span className="block font-[family-name:var(--font-great-vibes)] text-[#d965c9]">
                  Trusted Always.
                </span>
              </h1>
              <p className="mt-6 max-w-md text-base leading-7 text-[#1e3157]/82">
                Real experiences from real people. See how Glowish skincare is making a
                difference every day.
              </p>
              <div className="mt-8 grid gap-3 rounded-2xl border border-white/65 bg-white/55 p-4 shadow-sm backdrop-blur sm:grid-cols-3 lg:grid-cols-1 2xl:grid-cols-3">
                {stats.map((stat) => (
                  <article key={stat.label} className="flex min-w-0 items-center gap-3 border-white/60 sm:border-r sm:last:border-r-0 lg:border-r-0 2xl:border-r 2xl:last:border-r-0">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/70">
                      <stat.icon className={`h-5 w-5 ${stat.tone}`} />
                    </span>
                    <div className="min-w-0">
                      <p className="font-[family-name:var(--font-playfair-display)] text-lg font-semibold text-[#1e3157] sm:text-xl">{stat.value}</p>
                      <p className="text-[11px] font-semibold text-[#2A4C6A]/70">{stat.label}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className="relative min-h-[320px] lg:min-h-[370px]">
              <div className="absolute inset-x-[8%] bottom-8 h-24 rounded-[50%] bg-white/45 blur-2xl" />
              {[
                { image: stockImages.productOne, pos: "left-[16%] top-[24%] h-44 w-32 rotate-[-5deg]" },
                { image: stockImages.productTwo, pos: "left-[42%] top-[5%] h-56 w-40" },
                { image: stockImages.productThree, pos: "right-[5%] top-[30%] h-40 w-44 rotate-[5deg]" },
              ].map((item) => (
                <div
                  key={item.pos}
                  className={`absolute ${item.pos} overflow-hidden rounded-[2rem] border border-white/75 bg-white/65 p-2 shadow-[0_24px_65px_rgba(68,47,107,0.22)] backdrop-blur`}
                >
                  <div
                    className="h-full rounded-[1.4rem] bg-cover bg-center"
                    style={{ backgroundImage: `url(${item.image})` }}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/65 bg-white/50 p-5 shadow-[0_18px_55px_rgba(94,70,135,0.14)] backdrop-blur-xl sm:p-7">
          <div className="mb-6 flex items-center justify-center gap-3 text-center">
            <Leaf className="h-5 w-5 text-[#6ea43f]" />
            <h2 className="font-[family-name:var(--font-playfair-display)] text-3xl font-semibold text-[#1e3157]">
              What Our Customers Say
            </h2>
            <Leaf className="h-5 w-5 text-[#6ea43f]" />
          </div>

          <div className="mb-5 flex flex-wrap items-center gap-x-7 gap-y-3 border-b border-white/60 pb-4 text-xs font-semibold text-[#2A4C6A]/70">
            {filters.map((filter, index) => (
              <span key={filter} className={index === 0 ? "text-[#6ea43f]" : undefined}>
                {filter}
              </span>
            ))}
            <span className="ml-auto rounded-xl border border-white/70 bg-white/65 px-4 py-2 text-[#1e3157]">
              Sort by: Most Recent
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {reviews.map((review) => (
              <article key={review.name} className="rounded-2xl border border-white/65 bg-white/55 p-4 shadow-sm backdrop-blur">
                <div className="flex items-center gap-3">
                  <div
                    className="h-12 w-12 rounded-full bg-cover bg-center ring-2 ring-white/80"
                    style={{ backgroundImage: `url(${review.avatar})` }}
                  />
                  <div>
                    <p className="text-sm font-semibold text-[#1e3157]">{review.name}</p>
                    <p className="flex items-center gap-1 text-xs font-semibold text-[#6ea43f]">
                      Verified Buyer
                      <BadgeCheck className="h-3.5 w-3.5" />
                    </p>
                  </div>
                  <span className="ml-auto text-[11px] text-[#2A4C6A]/55">{review.date}</span>
                </div>
                <div className="mt-4 flex gap-0.5 text-[#FBC02D]">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="mt-3 min-h-20 text-sm leading-6 text-[#2A4C6A]/80">{review.text}</p>
                <div
                  className="mt-4 h-20 rounded-xl bg-cover bg-center"
                  style={{ backgroundImage: `url(${review.image})` }}
                />
                <p className="mt-2 text-xs font-semibold text-[#1e3157]/75">{review.product}</p>
              </article>
            ))}
          </div>

          <div className="mt-7 flex items-center justify-center gap-2">
            {["‹", "1", "2", "3", "...", "152", "›"].map((item) => (
              <span
                key={item}
                className={`flex h-9 min-w-9 items-center justify-center rounded-xl px-3 text-sm font-semibold ${
                  item === "1" ? "bg-[#6ea43f] text-white" : "bg-white/65 text-[#1e3157]"
                }`}
              >
                {item}
              </span>
            ))}
          </div>
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
