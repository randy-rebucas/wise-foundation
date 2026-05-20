import Link from "next/link";
import { BadgeCheck, Heart, Leaf, MessageCircle, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicReviewsList } from "@/components/marketplace/PublicReviewsList";

const stockImages = {
  productOne:
    "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=700&q=80",
  productTwo:
    "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=700&q=80",
  productThree:
    "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=700&q=80",
};

const heroHighlights = [
  { label: "Real reviews", value: "Verified buyers", icon: BadgeCheck, tone: "text-emerald-500" },
  { label: "Community", value: "Growing daily", icon: MessageCircle, tone: "text-violet-500" },
  { label: "Quality", value: "5-star favorites", icon: Star, tone: "text-pink-500" },
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
                {heroHighlights.map((stat) => (
                  <article
                    key={stat.label}
                    className="flex min-w-0 items-center gap-3 border-white/60 sm:border-r sm:last:border-r-0 lg:border-r-0 2xl:border-r 2xl:last:border-r-0"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/70">
                      <stat.icon className={`h-5 w-5 ${stat.tone}`} />
                    </span>
                    <div className="min-w-0">
                      <p className="font-[family-name:var(--font-playfair-display)] text-lg font-semibold text-[#1e3157] sm:text-xl">
                        {stat.value}
                      </p>
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

          <PublicReviewsList />

          <div className="mt-10 flex flex-col items-center gap-4 rounded-2xl border border-white/60 bg-[#f6def8]/40 p-6 text-center sm:flex-row sm:text-left">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600">
              <Heart className="h-7 w-7" />
            </span>
            <div className="flex-1">
              <p className="font-[family-name:var(--font-playfair-display)] text-xl font-semibold text-[#1e3157]">
                Share your glow
              </p>
              <p className="mt-1 text-sm text-[#2A4C6A]/72">
                Purchased from us? Sign in to leave a review after your order is delivered.
              </p>
            </div>
            <Button className="rounded-xl bg-gradient-to-r from-[#6ea43f] to-[#477d34] text-white" asChild>
              <Link href="/account/reviews">Write a review</Link>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
