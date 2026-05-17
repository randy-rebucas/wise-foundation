import Link from "next/link";
import { BadgeCheck, Quote, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

const reviews = [
  {
    name: "Angelica D.",
    title: "Verified buyer",
    text: "Glowish products transformed my skin. It feels so fresh, soft, and glowing every day.",
  },
  {
    name: "Rhealyn M.",
    title: "Verified buyer",
    text: "The exfoliating bar is amazing. My skin feels smoother and brighter. Highly recommend Glowish.",
  },
  {
    name: "Lara C.",
    title: "Verified buyer",
    text: "Finally found skincare that suits my skin. Natural, effective, and worth every peso.",
  },
  {
    name: "Isabella S.",
    title: "Premium member",
    text: "The shopping experience feels elegant and easy. I love the soft packaging and gentle products.",
  },
  {
    name: "Mika A.",
    title: "Verified buyer",
    text: "My order arrived quickly, and the products looked even better in person.",
  },
  {
    name: "Camille R.",
    title: "Verified buyer",
    text: "Beautiful formulas and a brand style that feels clean, fresh, and premium.",
  },
];

export default function ReviewsPage() {
  return (
    <div className="-mx-4 -my-8 min-h-full px-4 py-8 text-[#2A4C6A]">
      <section className="mx-auto max-w-6xl rounded-[2rem] border border-white/60 bg-white/35 p-6 shadow-[0_24px_80px_rgba(94,70,135,0.18)] backdrop-blur-xl sm:p-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#6ea43f]">
            Reviews
          </p>
          <h1 className="mt-3 font-serif text-4xl font-semibold tracking-tight text-[#3c2e60] sm:text-5xl">
            What our customers say
          </h1>
          <p className="mt-4 text-base leading-7 text-[#2A4C6A]/75">
            Real stories from shoppers who chose Glowish for radiant, soft, everyday care.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {reviews.map((review) => (
            <article key={review.name} className="rounded-3xl border border-white/65 bg-white/45 p-5 shadow-sm backdrop-blur">
              <Quote className="mb-4 h-8 w-8 text-[#d965c9]" />
              <div className="mb-3 flex gap-0.5 text-[#FBC02D]">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <p className="text-sm leading-6 text-[#2A4C6A]/80">&ldquo;{review.text}&rdquo;</p>
              <div className="mt-5 flex items-center gap-2">
                <BadgeCheck className="h-4 w-4 text-[#6ea43f]" />
                <div>
                  <p className="text-sm font-semibold text-[#3c2e60]">{review.name}</p>
                  <p className="text-xs text-[#6ea43f]">{review.title}</p>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Button className="rounded-xl bg-gradient-to-r from-[#6ea43f] to-[#477d34] text-white" asChild>
            <Link href="/shop">Shop customer favorites</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
