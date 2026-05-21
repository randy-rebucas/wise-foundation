import type { Metadata } from "next";
import Link from "next/link";
import { getPublicAppSettings } from "@/lib/services/appSettings.service";
import { buildPageMetadata } from "@/lib/seo/site";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicAppSettings();
  return buildPageMetadata({
    title: "Contact",
    description: `Contact ${settings.appName} — questions, orders, and support.`,
    path: "/contact",
    settings,
  });
}
import {
  Clock,
  Heart,
  Leaf,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Sparkles,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ContactForm } from "@/components/marketplace/ContactForm";

const stockImages = {
  cleanser:
    "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=700&q=80",
  serum:
    "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=700&q=80",
  productSet:
    "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=700&q=80",
  map:
    "https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=900&q=80",
};

const heroHighlights = [
  {
    title: "Fast Response",
    detail: "We reply within 24 hours",
    icon: MessageCircle,
    tone: "bg-violet-100 text-violet-600",
  },
  {
    title: "Customer First",
    detail: "Your satisfaction is our priority",
    icon: Heart,
    tone: "bg-pink-100 text-pink-600",
  },
  {
    title: "Trusted Support",
    detail: "Real people, real help",
    icon: ShieldCheck,
    tone: "bg-emerald-100 text-emerald-600",
  },
  {
    title: "Skincare Experts",
    detail: "Get advice from our experts",
    icon: Leaf,
    tone: "bg-blue-100 text-blue-600",
  },
];

const contactInfo = [
  {
    title: "Our Address",
    detail: "123 Glowish Lane\nBeauty City, BC 10001\nPhilippines",
    icon: MapPin,
    tone: "bg-violet-100 text-violet-600",
  },
  {
    title: "Phone Number",
    detail: "+63 912 345 6789\nMon - Fri, 9AM - 6PM",
    icon: Phone,
    tone: "bg-pink-100 text-pink-600",
  },
  {
    title: "Email Address",
    detail: "hello@glowish.ph\nWe reply within 24 hours",
    icon: Mail,
    tone: "bg-emerald-100 text-emerald-600",
  },
  {
    title: "Live Chat",
    detail: "Chat with us on our website\nMon - Fri, 9AM - 6PM",
    icon: MessageCircle,
    tone: "bg-sky-100 text-sky-600",
  },
];


export default function ContactPage() {
  return (
    <div className="-mx-4 -my-8 min-h-full px-4 py-8 font-[family-name:var(--font-plus-jakarta-sans)] text-[#2A4C6A]">
      <div className="mx-auto max-w-7xl space-y-5">
        <section className="relative isolate overflow-hidden rounded-[2.25rem] border border-white/60 bg-white/20 px-6 py-10 shadow-[0_24px_80px_rgba(94,70,135,0.16)] backdrop-blur-xl sm:px-10 lg:min-h-[430px]">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_76%_44%,rgba(255,255,255,0.75),transparent_24%),radial-gradient(circle_at_88%_36%,rgba(255,51,204,0.16),transparent_36%)]" />
          <div className="grid gap-10 lg:grid-cols-[0.74fr_1.26fr] lg:items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.12em] text-[#6ea43f]">
                Contact Us
              </p>
              <h1 className="mt-4 font-[family-name:var(--font-playfair-display)] text-4xl font-semibold leading-tight tracking-tight text-[#1e3157] sm:text-5xl lg:text-6xl">
                We&apos;d Love to
                <span className="block font-[family-name:var(--font-great-vibes)] text-[#d965c9]">
                  Hear from You!
                </span>
              </h1>
              <p className="mt-6 max-w-md text-base leading-7 text-[#1e3157]/82">
                Have a question, need skincare advice, or just want to say hello? Our Glowish
                team is here to help you glow with confidence.
              </p>
              <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {heroHighlights.map((item) => (
                  <article key={item.title} className="min-w-0">
                    <span className={`flex h-12 w-12 items-center justify-center rounded-full ${item.tone}`}>
                      <item.icon className="h-6 w-6" />
                    </span>
                    <h2 className="mt-3 text-sm font-semibold text-[#1e3157]">{item.title}</h2>
                    <p className="mt-1 text-xs leading-5 text-[#2A4C6A]/72">{item.detail}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="relative min-h-[320px] lg:min-h-[370px]">
              <div className="absolute inset-x-[8%] bottom-8 h-24 rounded-[50%] bg-white/45 blur-2xl" />
              {[
                { image: stockImages.cleanser, pos: "left-[16%] top-[24%] h-44 w-32 rotate-[-5deg]" },
                { image: stockImages.serum, pos: "left-[42%] top-[5%] h-56 w-40" },
                { image: stockImages.productSet, pos: "right-[5%] top-[30%] h-40 w-44 rotate-[5deg]" },
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

        <section className="grid gap-5 rounded-[2rem] border border-white/65 bg-white/55 p-5 shadow-[0_18px_55px_rgba(94,70,135,0.14)] backdrop-blur-xl lg:grid-cols-[0.92fr_0.68fr_1fr]">
          <div className="border-white/60 lg:border-r lg:pr-5">
            <div className="mb-5 flex items-center gap-2">
              <Leaf className="h-4 w-4 text-[#6ea43f]" />
              <h2 className="font-[family-name:var(--font-playfair-display)] text-2xl font-semibold text-[#1e3157]">
                Send Us a Message
              </h2>
            </div>
            <p className="text-sm text-[#2A4C6A]/72">
              Fill out the form below and we&apos;ll get back to you as soon as possible.
            </p>
            <ContactForm />
          </div>

          <div className="border-white/60 lg:border-r lg:px-3">
            <div className="mb-5 flex items-center gap-2">
              <Leaf className="h-4 w-4 text-[#6ea43f]" />
              <h2 className="font-[family-name:var(--font-playfair-display)] text-2xl font-semibold text-[#1e3157]">
                Contact Information
              </h2>
            </div>
            <div className="space-y-4">
              {contactInfo.map((item) => (
                <article key={item.title} className="flex gap-3">
                  <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${item.tone}`}>
                    <item.icon className="h-6 w-6" />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-[#1e3157]">{item.title}</h3>
                    <p className="mt-1 whitespace-pre-line text-xs leading-5 text-[#2A4C6A]/72">
                      {item.detail}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-5 flex items-center gap-2">
              <Leaf className="h-4 w-4 text-[#6ea43f]" />
              <h2 className="font-[family-name:var(--font-playfair-display)] text-2xl font-semibold text-[#1e3157]">
                Find Us
              </h2>
            </div>
            <div
              className="relative h-48 overflow-hidden rounded-2xl border border-white/65 bg-cover bg-center"
              style={{ backgroundImage: `url(${stockImages.map})` }}
            >
              <div className="absolute inset-0 bg-white/25" />
              <span className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-violet-500 text-white shadow-[0_16px_35px_rgba(124,58,237,0.32)]">
                <MapPin className="h-8 w-8" />
              </span>
            </div>
            <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-white/65 bg-white/45 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 text-violet-600">
                  <Store className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-[#1e3157]">Visit Our Store</p>
                  <p className="text-xs leading-5 text-[#2A4C6A]/72">
                    Come experience Glowish in person.
                  </p>
                </div>
              </div>
              <Button variant="outline" className="rounded-xl border-white/70 bg-white/65" asChild>
                <Link href="/shop">Get Directions</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-4 rounded-[2rem] border border-white/60 bg-[#f6def8]/55 p-5 shadow-[0_14px_45px_rgba(94,70,135,0.12)] backdrop-blur-xl lg:flex-row lg:items-center">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600">
            <Mail className="h-8 w-8" />
          </span>
          <div className="lg:w-64">
            <h2 className="font-[family-name:var(--font-playfair-display)] text-2xl font-semibold text-[#1e3157]">
              Stay in the Glow!
            </h2>
            <p className="mt-1 text-sm leading-6 text-[#2A4C6A]/72">
              Subscribe to get updates on new products, exclusive offers, and skincare tips.
            </p>
          </div>
          <div className="flex flex-1 flex-col gap-3 sm:flex-row lg:ml-auto">
            <Input className="rounded-xl border-white/70 bg-white/75" placeholder="Enter your email address" />
            <Button className="rounded-xl bg-gradient-to-r from-[#6ea43f] to-[#477d34] text-white">
              Subscribe
            </Button>
          </div>
          <div className="flex gap-3 lg:ml-8">
            {[Heart, Sparkles, MessageCircle, Mail].map((Icon, index) => (
              <span key={index} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/65 text-violet-500">
                <Icon className="h-5 w-5" />
              </span>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
