import Link from "next/link";
import { FlaskConical, Heart, Leaf, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppLogo } from "@/components/branding/AppLogo";

const values = [
  {
    title: "Natural confidence",
    description: "Glowish is built around gentle daily care that helps customers feel radiant.",
    icon: Leaf,
  },
  {
    title: "Science-minded formulas",
    description: "We favor thoughtful ingredients, clear routines, and skin-friendly selections.",
    icon: FlaskConical,
  },
  {
    title: "Premium experience",
    description: "From product discovery to checkout, every detail should feel soft and luxurious.",
    icon: Sparkles,
  },
  {
    title: "Trusted care",
    description: "Quality and customer confidence guide how we present and fulfill products.",
    icon: ShieldCheck,
  },
];

export default function AboutUsPage() {
  return (
    <div className="-mx-4 -my-8 min-h-full px-4 py-8 text-[#2A4C6A]">
      <section className="mx-auto grid max-w-6xl gap-8 rounded-[2rem] border border-white/60 bg-white/35 p-6 shadow-[0_24px_80px_rgba(94,70,135,0.18)] backdrop-blur-xl sm:p-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div className="rounded-[2rem] border border-white/65 bg-white/45 p-8 text-center shadow-sm backdrop-blur">
          <AppLogo size="2xl" className="mx-auto" priority />
          <p className="mt-5 text-sm font-semibold uppercase tracking-[0.28em] text-[#6ea43f]">
            About Glowish
          </p>
          <h1 className="mt-3 font-serif text-4xl font-semibold tracking-tight text-[#3c2e60] sm:text-5xl">
            Glow naturally, wish beautifully.
          </h1>
          <p className="mt-4 text-base leading-7 text-[#2A4C6A]/75">
            Glowish is a soft-glam skincare marketplace focused on radiant confidence,
            approachable rituals, and premium product discovery.
          </p>
          <Button className="mt-6 rounded-xl bg-gradient-to-r from-[#6ea43f] to-[#477d34] text-white" asChild>
            <Link href="/shop">Explore products</Link>
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {values.map((value) => (
            <article key={value.title} className="rounded-3xl border border-white/65 bg-white/45 p-5 shadow-sm backdrop-blur">
              <value.icon className="mb-4 h-8 w-8 text-[#6ea43f]" />
              <h2 className="font-semibold text-[#3c2e60]">{value.title}</h2>
              <p className="mt-2 text-sm leading-6 text-[#2A4C6A]/75">{value.description}</p>
            </article>
          ))}
          <article className="rounded-3xl border border-white/65 bg-gradient-to-br from-pink-100/70 to-violet-100/70 p-5 shadow-sm backdrop-blur sm:col-span-2">
            <Heart className="mb-4 h-8 w-8 text-[#d965c9]" />
            <h2 className="font-semibold text-[#3c2e60]">Made for your glow</h2>
            <p className="mt-2 text-sm leading-6 text-[#2A4C6A]/75">
              The marketplace design mirrors the brand: luminous gradients, glass-like cards,
              green Glowish accents, and a gentle skincare-first shopping flow.
            </p>
          </article>
        </div>
      </section>
    </div>
  );
}
