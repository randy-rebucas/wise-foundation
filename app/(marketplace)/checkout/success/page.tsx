"use client";

import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Banknote,
  Building2,
  Check,
  Mail,
  Package,
  ShoppingBag,
  Sparkles,
  Truck,
} from "lucide-react";
import { MARKETPLACE_DEPOSIT_BANK_ACCOUNTS } from "@/lib/constants/marketplaceBankAccounts";
import { Button } from "@/components/ui/button";
import { useFormatCurrency } from "@/components/providers/TenantProvider";

const STOCK_PRODUCT_IMAGE =
  "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=700&q=80";


const NEXT_STEPS = [
  {
    title: "Order Confirmed",
    description: "We've received your order and it's being processed.",
    icon: Package,
    tone: "bg-violet-100 text-violet-600",
  },
  {
    title: "On Its Way",
    description: "We'll notify you once your order is shipped.",
    icon: Truck,
    tone: "bg-emerald-100 text-emerald-600",
  },
  {
    title: "Delivered",
    description: "Get ready to glow! Your skincare is on its way.",
    icon: ShoppingBag,
    tone: "bg-pink-100 text-pink-600",
  },
];

function formatOrderDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function SuccessInner() {
  const search = useSearchParams();
  const money = useFormatCurrency();
  const orderNumber = search.get("orderNumber") ?? "GW12345678";
  const totalRaw = search.get("total");
  const total = totalRaw ? Number(totalRaw) : 989;
  const paymentMethod = search.get("paymentMethod");
  const orderStatus = search.get("status");
  const isBankTransferPending =
    paymentMethod === "bank_transfer" && orderStatus === "pending";
  const isCodPending = paymentMethod === "cash" && orderStatus === "pending";
  const orderDate = formatOrderDate(new Date());
  const displayNumber = orderNumber.startsWith("#") ? orderNumber : `#${orderNumber}`;

  return (
    <div className="-mx-4 -my-8 min-h-full px-4 py-8 font-[family-name:var(--font-plus-jakarta-sans)] text-[#2A4C6A]">
      <div className="mx-auto max-w-4xl space-y-6">
        <section className="relative isolate overflow-hidden rounded-[2.25rem] border border-white/60 bg-white/25 px-6 py-12 text-center shadow-[0_24px_80px_rgba(94,70,135,0.16)] backdrop-blur-xl sm:px-10">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_30%,rgba(255,255,255,0.85),transparent_45%),radial-gradient(circle_at_80%_70%,rgba(255,51,204,0.14),transparent_40%)]" />
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-white/70 bg-white/70 shadow-[0_20px_55px_rgba(110,164,63,0.35)]">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#6ea43f] text-white">
              <Check className="h-9 w-9" strokeWidth={3} />
            </div>
          </div>
          <h1 className="mt-6 font-[family-name:var(--font-playfair-display)] text-4xl font-semibold text-[#6ea43f] sm:text-5xl">
            Thank
            <span className="font-[family-name:var(--font-great-vibes)] text-[#d965c9]"> You!</span>
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-base leading-7 text-[#1e3157]/82">
            {isBankTransferPending
              ? "Your order is reserved. Complete your bank transfer to confirm payment."
              : isCodPending
                ? "Your order is confirmed. Please prepare cash for delivery."
                : "Your order has been placed successfully. We appreciate your trust in Glowish."}
          </p>
        </section>

        {isCodPending ? (
          <section className="rounded-[2rem] border border-emerald-200/80 bg-emerald-50/50 p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
              <Banknote className="h-5 w-5" />
              Cash on delivery
            </div>
            <p className="mt-2 text-sm leading-6 text-[#2A4C6A]/78">
              Pay{" "}
              <span className="font-semibold text-[#1e3157]">
                {Number.isFinite(total) ? money(total) : money(989)}
              </span>{" "}
              in cash when your order arrives. Have the exact amount ready if possible. Order{" "}
              <span className="font-mono font-semibold">{displayNumber}</span> is pending until
              payment is collected on delivery.
            </p>
            <ul className="mt-3 space-y-2 text-xs leading-5 text-[#2A4C6A]/75">
              <li>Ensure someone is available at your shipping address to receive and pay.</li>
              <li>Our courier may have limited change — paying the exact amount speeds up delivery.</li>
              <li>You can track status under My Orders after signing in.</li>
            </ul>
          </section>
        ) : null}

        {isBankTransferPending ? (
          <section className="rounded-[2rem] border border-amber-200/80 bg-amber-50/50 p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
              <Building2 className="h-5 w-5" />
              Bank transfer instructions
            </div>
            <p className="mt-2 text-sm leading-6 text-[#2A4C6A]/78">
              Transfer <span className="font-semibold text-[#1e3157]">{Number.isFinite(total) ? money(total) : money(989)}</span> to
              one of the accounts below. Include your order number{" "}
              <span className="font-mono font-semibold">{displayNumber}</span> in the transfer
              reference or notes. We will confirm within 1–2 business days.
            </p>
            <ul className="mt-4 space-y-3">
              {MARKETPLACE_DEPOSIT_BANK_ACCOUNTS.map((account) => (
                <li
                  key={account.id}
                  className="rounded-xl border border-white/70 bg-white/80 px-4 py-3 text-sm"
                >
                  <p className="font-semibold text-[#1e3157]">{account.bankName}</p>
                  <p className="text-[#2A4C6A]/75">{account.accountName}</p>
                  <p className="font-mono text-[#1e3157]">{account.accountNumber}</p>
                  {account.branch ? (
                    <p className="text-xs text-[#2A4C6A]/60">{account.branch}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="rounded-[2rem] border border-white/65 bg-white/55 p-5 shadow-[0_18px_55px_rgba(94,70,135,0.14)] backdrop-blur-xl sm:p-6">
          <div className="flex flex-col gap-2 border-b border-white/60 pb-4 text-sm sm:flex-row sm:items-center sm:justify-between">
            <p>
              <span className="text-[#2A4C6A]/65">Order Number </span>
              <span className="font-semibold text-[#6ea43f]">{displayNumber}</span>
            </p>
            <p>
              <span className="text-[#2A4C6A]/65">Order Date </span>
              <span className="font-semibold text-[#1e3157]">{orderDate}</span>
            </p>
          </div>

          <div className="mt-4 flex gap-4 border-b border-white/60 pb-4">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-white/70 bg-white/60">
              <Image
                src={STOCK_PRODUCT_IMAGE}
                alt=""
                fill
                className="object-cover"
                sizes="80px"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-[#1e3157]">Glowish Radiance Serum</p>
              <p className="mt-1 text-sm text-[#2A4C6A]/65">30ml</p>
              <p className="mt-1 text-sm text-[#2A4C6A]/65">Quantity: 1</p>
            </div>
            <p className="shrink-0 text-lg font-bold text-[#1e3157]">
              {Number.isFinite(total) ? money(total) : money(989)}
            </p>
          </div>

          <div className="mt-4 flex items-start gap-3 rounded-2xl bg-violet-50/70 px-4 py-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600">
              <Mail className="h-5 w-5" />
            </span>
            <p className="text-sm leading-6 text-[#2A4C6A]/78">
              We&apos;ve sent an order confirmation email to{" "}
              <span className="font-semibold text-[#1e3157]">hello@glowish.ph</span>.
            </p>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/65 bg-white/55 p-5 shadow-[0_18px_55px_rgba(94,70,135,0.14)] backdrop-blur-xl sm:p-7">
          <h2 className="text-center font-[family-name:var(--font-playfair-display)] text-2xl font-semibold text-[#1e3157]">
            What&apos;s Next?
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {NEXT_STEPS.map((step) => (
              <article key={step.title} className="text-center">
                <span
                  className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${step.tone}`}
                >
                  <step.icon className="h-7 w-7" />
                </span>
                <h3 className="mt-3 font-semibold text-[#1e3157]">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#2A4C6A]/72">{step.description}</p>
              </article>
            ))}
          </div>

          <div className="mt-8 space-y-3">
            <Button
              className="h-12 w-full rounded-xl bg-gradient-to-r from-[#6ea43f] to-[#477d34] text-white"
              asChild
            >
              <Link href="/shop">
                Continue Shopping
                <ShoppingBag className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <p className="text-center">
              <Link
                href="/account"
                className="inline-flex items-center text-sm font-semibold text-[#6ea43f] hover:underline"
              >
                View My Orders
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function MarketplaceCheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="-mx-4 -my-8 px-4 py-16 text-center font-[family-name:var(--font-plus-jakarta-sans)] text-[#2A4C6A]/70">
          Loading…
        </div>
      }
    >
      <SuccessInner />
    </Suspense>
  );
}
