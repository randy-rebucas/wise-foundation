import Link from "next/link";
import { ArrowRight, Heart, Home, Leaf, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const categories = [
  {
    title: "Cosmetics",
    description: "Radiance-focused essentials for your daily glow routine.",
    icon: Sparkles,
    color: "from-pink-200/85 to-fuchsia-100/75 text-pink-700",
  },
  {
    title: "Wellness",
    description: "Care selections made to support beauty from within.",
    icon: Leaf,
    color: "from-emerald-200/85 to-lime-100/75 text-emerald-700",
  },
  {
    title: "Homecare",
    description: "Fresh, gentle products for clean and confident living.",
    icon: Home,
    color: "from-sky-200/85 to-blue-100/75 text-sky-700",
  },
  {
    title: "Scent",
    description: "Soft signature notes for an effortless Glowish finish.",
    icon: Heart,
    color: "from-violet-200/85 to-purple-100/75 text-violet-700",
  },
];

export default function CategoriesPage() {
  return (
    <div className="-mx-4 -my-8 min-h-full px-4 py-8 text-[#2A4C6A]">
      <section className="mx-auto max-w-6xl rounded-[2rem] border border-white/60 bg-white/35 p-6 shadow-[0_24px_80px_rgba(94,70,135,0.18)] backdrop-blur-xl sm:p-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#6ea43f]">
            Categories
          </p>
          <h1 className="mt-3 font-serif text-4xl font-semibold tracking-tight text-[#3c2e60] sm:text-5xl">
            Shop by Glowish ritual
          </h1>
          <p className="mt-4 text-base leading-7 text-[#2A4C6A]/75">
            Explore skincare, wellness, homecare, and scent collections designed to match the
            soft premium look of the Glowish marketplace.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((category) => (
            <Link
              key={category.title}
              href="/shop"
              className="group rounded-3xl border border-white/65 bg-white/45 p-5 shadow-sm backdrop-blur transition hover:-translate-y-1 hover:bg-white/70 hover:shadow-[0_20px_55px_rgba(94,70,135,0.18)]"
            >
              <span
                className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${category.color}`}
              >
                <category.icon className="h-7 w-7" />
              </span>
              <h2 className="text-lg font-semibold text-[#3c2e60]">{category.title}</h2>
              <p className="mt-2 text-sm leading-6 text-[#2A4C6A]/75">{category.description}</p>
              <span className="mt-5 inline-flex items-center text-sm font-semibold text-[#2B6B56]">
                Browse products
                <ArrowRight className="ml-1.5 h-4 w-4 transition group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-8 rounded-3xl border border-white/65 bg-white/45 p-5 text-center backdrop-blur">
          <ShieldCheck className="mx-auto mb-3 h-8 w-8 text-[#6ea43f]" />
          <p className="font-semibold text-[#3c2e60]">Every category follows Glowish quality care.</p>
          <p className="mt-1 text-sm text-[#2A4C6A]/70">
            Natural-feeling, confidence-focused products for everyday beauty.
          </p>
          <Button className="mt-4 rounded-xl bg-gradient-to-r from-[#6ea43f] to-[#477d34] text-white" asChild>
            <Link href="/shop">Shop all products</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
