import Link from "next/link";
import { Clock, Mail, MapPin, MessageCircle, Phone, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const contactCards = [
  {
    title: "Our address",
    detail: "123 Glowish Lane, Beauty City, Philippines",
    icon: MapPin,
  },
  {
    title: "Phone number",
    detail: "+63 912 345 6789",
    icon: Phone,
  },
  {
    title: "Email address",
    detail: "hello@glowish.ph",
    icon: Mail,
  },
  {
    title: "Live chat",
    detail: "Mon - Fri, 9AM - 6PM",
    icon: MessageCircle,
  },
];

export default function ContactPage() {
  return (
    <div className="-mx-4 -my-8 min-h-full px-4 py-8 text-[#2A4C6A]">
      <section className="mx-auto max-w-6xl rounded-[2rem] border border-white/60 bg-white/35 p-6 shadow-[0_24px_80px_rgba(94,70,135,0.18)] backdrop-blur-xl sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#6ea43f]">
              Contact us
            </p>
            <h1 className="mt-3 font-serif text-4xl font-semibold tracking-tight text-[#3c2e60] sm:text-5xl">
              We&apos;d love to hear from you.
            </h1>
            <p className="mt-4 text-base leading-7 text-[#2A4C6A]/75">
              Have a question, need skincare advice, or want to say hello? The Glowish team is
              here to help you glow with confidence.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                ["Fast response", "We reply within 24 hours"],
                ["Customer first", "Your satisfaction is our priority"],
                ["Trusted support", "Real people, real help"],
                ["Skincare experts", "Get advice from our team"],
              ].map(([title, detail]) => (
                <div key={title} className="rounded-2xl border border-white/65 bg-white/45 p-4 backdrop-blur">
                  <ShieldCheck className="mb-3 h-6 w-6 text-[#6ea43f]" />
                  <p className="font-semibold text-[#3c2e60]">{title}</p>
                  <p className="mt-1 text-xs text-[#2A4C6A]/70">{detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/65 bg-white/45 p-5 shadow-sm backdrop-blur">
            <h2 className="font-serif text-2xl font-semibold text-[#3c2e60]">Send us a message</h2>
            <p className="mt-1 text-sm text-[#2A4C6A]/70">
              Fill out the form below and we&apos;ll get back to you as soon as possible.
            </p>
            <form className="mt-5 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Input className="rounded-xl border-white/70 bg-white/55" placeholder="Your name" />
                <Input className="rounded-xl border-white/70 bg-white/55" placeholder="Your email" />
              </div>
              <Input className="rounded-xl border-white/70 bg-white/55" placeholder="Subject" />
              <textarea
                className="min-h-32 w-full rounded-xl border border-white/70 bg-white/55 px-3 py-2 text-sm shadow-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-[#00E5FF]/50"
                placeholder="Your message"
              />
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  type="button"
                  className="rounded-xl bg-gradient-to-r from-[#6ea43f] to-[#477d34] text-white"
                >
                  Send message
                </Button>
                <p className="text-xs text-[#2A4C6A]/65">Your information is safe with us.</p>
              </div>
            </form>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {contactCards.map((card) => (
            <article key={card.title} className="rounded-3xl border border-white/65 bg-white/45 p-5 shadow-sm backdrop-blur">
              <card.icon className="mb-4 h-8 w-8 text-[#6ea43f]" />
              <h3 className="font-semibold text-[#3c2e60]">{card.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#2A4C6A]/75">{card.detail}</p>
            </article>
          ))}
        </div>

        <div className="mt-8 rounded-3xl border border-white/65 bg-white/45 p-5 backdrop-blur">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-[#6ea43f]" />
              <div>
                <p className="font-semibold text-[#3c2e60]">Visit our shop page anytime.</p>
                <p className="text-sm text-[#2A4C6A]/70">Browse products while we prepare your reply.</p>
              </div>
            </div>
            <Button variant="outline" className="rounded-xl border-white/70 bg-white/55" asChild>
              <Link href="/shop">Go to shop</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
