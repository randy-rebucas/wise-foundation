"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Check,
  CreditCard,
  Loader2,
  Lock,
  Package,
  ShoppingBag,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFormatCurrency } from "@/components/providers/TenantProvider";
import { useMarketplaceCartStore } from "@/store/marketplaceCartStore";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  MARKETPLACE_SHIPPING_METHODS,
  computeMarketplaceOrderTotal,
} from "@/lib/utils/marketplaceShipping";
import type { MarketplaceSavedAddress } from "@/lib/types/customerAccount";

const STOCK_IMAGES = {
  hero: [
    "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=700&q=80",
    "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=700&q=80",
    "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=700&q=80",
  ],
  product:
    "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=700&q=80",
};


const CHECKOUT_STEPS = [
  { id: "cart", label: "Cart" },
  { id: "information", label: "Information" },
  { id: "shipping", label: "Shipping" },
  { id: "payment", label: "Payment" },
  { id: "review", label: "Review" },
] as const;

const SHIPPING_OPTIONS = MARKETPLACE_SHIPPING_METHODS;

const PAYMENT_OPTIONS = [
  { id: "card" as const, label: "Credit / Debit Card", badges: ["Visa", "Mastercard"] },
  { id: "gcash" as const, label: "GCash", badges: ["GCash"] },
  { id: "bank_transfer" as const, label: "Bank Transfer", badges: ["Bank"] },
  { id: "cash" as const, label: "Cash on Delivery", badges: ["COD"] },
];

const EMPTY_FORM = {
  fullName: "",
  email: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  region: "",
  postalCode: "",
  country: "Philippines",
  paymentMethod: "card" as "cash" | "gcash" | "card" | "bank_transfer" | "credit",
  notes: "",
};

export default function MarketplaceCheckoutPage() {
  const router = useRouter();
  const money = useFormatCurrency();
  const { toast } = useToast();
  const { data: session, status: sessionStatus } = useSession();
  const items = useMarketplaceCartStore((s) => s.items);
  const getSubtotal = useMarketplaceCartStore((s) => s.getSubtotal);
  const clear = useMarketplaceCartStore((s) => s.clear);
  const subtotal = getSubtotal();

  const [loading, setLoading] = useState(false);
  const [shippingMethod, setShippingMethod] =
    useState<(typeof SHIPPING_OPTIONS)[number]["id"]>("standard");
  const [marketingOptIn, setMarketingOptIn] = useState(true);
  const [saveInfo, setSaveInfo] = useState(true);
  const [savedAddresses, setSavedAddresses] = useState<MarketplaceSavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [memberDiscountPercent, setMemberDiscountPercent] = useState(0);

  const [form, setForm] = useState({ ...EMPTY_FORM });

  const shippingCost =
    SHIPPING_OPTIONS.find((option) => option.id === shippingMethod)?.price ?? 120;
  const discountAmount =
    memberDiscountPercent > 0
      ? Math.round((subtotal * Math.min(100, memberDiscountPercent)) / 100 * 100) / 100
      : 0;
  const total = computeMarketplaceOrderTotal(subtotal, discountAmount, shippingCost);

  const applyAddress = useCallback((addr: MarketplaceSavedAddress) => {
    setForm((f) => ({
      ...f,
      fullName: addr.fullName,
      phone: addr.phone,
      line1: addr.line1,
      line2: addr.line2 ?? "",
      city: addr.city,
      region: addr.region,
      postalCode: addr.postalCode,
    }));
  }, []);

  useEffect(() => {
    if (sessionStatus !== "authenticated" || session?.user?.role !== "CUSTOMER") return;

    queueMicrotask(() => {
      void (async () => {
        try {
          const [dashRes, addrRes] = await Promise.all([
            fetch("/api/account/dashboard"),
            fetch("/api/account/saved-addresses"),
          ]);
          const dashJson = await dashRes.json();
          if (dashRes.ok && dashJson.success) {
            const profile = dashJson.data.profile as { name: string; email: string; phone?: string };
            setMemberDiscountPercent(dashJson.data.memberDiscountPercent ?? 0);
            setForm((f) => ({
              ...f,
              fullName: f.fullName || profile.name || "",
              email: f.email || profile.email || "",
              phone: f.phone || profile.phone || "",
            }));
          }
          const addrJson = await addrRes.json();
          if (addrRes.ok && addrJson.success) {
            const list = addrJson.data as MarketplaceSavedAddress[];
            setSavedAddresses(list);
            const def = list.find((a) => a.isDefault) ?? list[0];
            if (def) {
              setSelectedAddressId(def.id);
              applyAddress(def);
            }
          }
        } catch {
          /* optional prefill */
        }
      })();
    });
  }, [sessionStatus, session?.user?.role, applyAddress]);
  const isRemote = (url: string) => /^https?:\/\//i.test(url);

  function lineImage(url: string | undefined) {
    return url || STOCK_IMAGES.product;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0) {
      toast({ title: "Cart is empty", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/marketplace/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            productId: i.productId,
            variantId: i.variantId,
            quantity: i.quantity,
          })),
          shipping: {
            fullName: form.fullName.trim(),
            email: form.email.trim(),
            phone: form.phone.trim(),
            line1: form.line1.trim(),
            line2: form.line2.trim() || undefined,
            city: form.city.trim(),
            region: form.region.trim(),
            postalCode: form.postalCode.trim(),
          },
          shippingMethod,
          paymentMethod: form.paymentMethod,
          notes: form.notes.trim() || undefined,
          saveAddress: saveInfo && session?.user?.role === "CUSTOMER",
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Checkout failed");
      const { orderNumber, total: orderTotal } = json.data as {
        orderNumber: string;
        total: number;
      };
      clear();
      router.push(
        `/checkout/success?orderNumber=${encodeURIComponent(orderNumber)}&total=${encodeURIComponent(String(orderTotal))}`
      );
    } catch (err) {
      toast({
        title: "Could not place order",
        description: err instanceof Error ? err.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="-mx-4 -my-8 min-h-full px-4 py-8 font-[family-name:var(--font-plus-jakarta-sans)] text-[#2A4C6A]">
        <div className="mx-auto max-w-3xl rounded-[2rem] border border-white/65 bg-white/55 p-10 text-center shadow-[0_18px_55px_rgba(94,70,135,0.14)] backdrop-blur-xl">
          <Package className="mx-auto mb-4 h-12 w-12 text-[#6ea43f]/70" />
          <h1 className="font-[family-name:var(--font-playfair-display)] text-3xl font-semibold text-[#1e3157]">
            Checkout
          </h1>
          <p className="mt-2 text-sm text-[#2A4C6A]/75">Your cart is empty.</p>
          <Button className="mt-6 rounded-xl bg-gradient-to-r from-[#6ea43f] to-[#477d34] text-white" asChild>
            <Link href="/shop">Browse products</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="-mx-4 -my-8 min-h-full px-4 py-8 font-[family-name:var(--font-plus-jakarta-sans)] text-[#2A4C6A]"
    >
      <div className="mx-auto max-w-7xl space-y-5">
        <section className="relative isolate overflow-hidden rounded-[2.25rem] border border-white/60 bg-white/20 px-6 py-8 shadow-[0_24px_80px_rgba(94,70,135,0.16)] backdrop-blur-xl sm:px-10 lg:min-h-[260px]">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_76%_44%,rgba(255,255,255,0.75),transparent_24%),radial-gradient(circle_at_88%_36%,rgba(255,51,204,0.16),transparent_36%)]" />
          <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-center">
            <div>
              <h1 className="font-[family-name:var(--font-playfair-display)] text-4xl font-semibold text-[#1e3157] sm:text-5xl">
                Checkout
              </h1>
              <div className="mt-3 flex items-center gap-2 text-sm text-[#2A4C6A]/70">
                <Link href="/" className="hover:text-[#2B6B56]">
                  Home
                </Link>
                <span>/</span>
                <Link href="/cart" className="hover:text-[#2B6B56]">
                  Cart
                </Link>
                <span>/</span>
                <span className="font-semibold text-[#3c2e60]">Checkout</span>
              </div>
            </div>

            <div className="relative min-h-[200px] lg:min-h-[240px]">
              <div className="absolute inset-x-[8%] bottom-6 h-20 rounded-[50%] bg-white/45 blur-2xl" />
              {STOCK_IMAGES.hero.map((image, index) => {
                const positions = [
                  "left-[16%] top-[24%] h-40 w-32 rotate-[-5deg]",
                  "left-[42%] top-[5%] h-52 w-36",
                  "right-[5%] top-[30%] h-44 w-40 rotate-[5deg]",
                ];
                return (
                  <div
                    key={image}
                    className={`absolute ${positions[index]} overflow-hidden rounded-[2rem] border border-white/75 bg-white/65 p-2 shadow-[0_24px_65px_rgba(68,47,107,0.22)] backdrop-blur`}
                  >
                    <div
                      className="h-full rounded-[1.4rem] bg-cover bg-center"
                      style={{ backgroundImage: `url(${image})` }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/65 bg-white/55 px-4 py-5 shadow-sm backdrop-blur-xl sm:px-6">
          <ol className="flex flex-wrap items-center justify-between gap-4">
            {CHECKOUT_STEPS.map((step, index) => {
              const active = step.id === "information";
              const completed = step.id === "cart";
              return (
                <li key={step.id} className="flex min-w-[4.5rem] flex-1 flex-col items-center gap-2">
                  <span
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold",
                      completed && "border-violet-300 bg-violet-100 text-violet-600",
                      active && "border-[#6ea43f] bg-[#6ea43f] text-white",
                      !completed && !active && "border-white/70 bg-white/60 text-[#2A4C6A]/45"
                    )}
                  >
                    {completed ? <Check className="h-5 w-5" /> : index + 1}
                  </span>
                  <span
                    className={cn(
                      "text-center text-xs font-semibold",
                      active ? "text-[#6ea43f]" : "text-[#2A4C6A]/65"
                    )}
                  >
                    {step.label}
                  </span>
                </li>
              );
            })}
          </ol>
          <div className="mt-4 h-1 overflow-hidden rounded-full bg-violet-100">
            <div className="h-full w-[40%] rounded-full bg-[#6ea43f]" />
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-5">
            <section className="rounded-[2rem] border border-white/65 bg-white/55 p-5 shadow-[0_18px_55px_rgba(94,70,135,0.14)] backdrop-blur-xl sm:p-6">
              {savedAddresses.length > 0 ? (
                <div className="mb-4 space-y-2">
                  <Label>Saved address</Label>
                  <Select
                    value={selectedAddressId || "new"}
                    onValueChange={(id) => {
                      setSelectedAddressId(id);
                      if (id === "new") return;
                      const addr = savedAddresses.find((a) => a.id === id);
                      if (addr) applyAddress(addr);
                    }}
                  >
                    <SelectTrigger className="rounded-xl border-white/70 bg-white/65">
                      <SelectValue placeholder="Choose address" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">Enter a new address</SelectItem>
                      {savedAddresses.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.label} — {a.line1}, {a.city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              <h2 className="font-[family-name:var(--font-playfair-display)] text-xl font-semibold text-[#1e3157]">
                Contact Information
              </h2>
              <div className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    className="rounded-xl border-white/70 bg-white/65"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-[#2A4C6A]/75">
                  <Checkbox
                    checked={marketingOptIn}
                    onCheckedChange={(checked) => setMarketingOptIn(checked === true)}
                  />
                  Keep me updated on news and exclusive offers
                </label>
              </div>
            </section>

            <section className="rounded-[2rem] border border-white/65 bg-white/55 p-5 shadow-[0_18px_55px_rgba(94,70,135,0.14)] backdrop-blur-xl sm:p-6">
              <h2 className="font-[family-name:var(--font-playfair-display)] text-xl font-semibold text-[#1e3157]">
                Shipping Address
              </h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    required
                    className="rounded-xl border-white/70 bg-white/65"
                    value={form.fullName}
                    onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    required
                    className="rounded-xl border-white/70 bg-white/65"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country *</Label>
                  <Select
                    value={form.country}
                    onValueChange={(value) => setForm((f) => ({ ...f, country: value }))}
                  >
                    <SelectTrigger id="country" className="rounded-xl border-white/70 bg-white/65">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Philippines">Philippines</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="line1">Address *</Label>
                  <Input
                    id="line1"
                    required
                    className="rounded-xl border-white/70 bg-white/65"
                    value={form.line1}
                    onChange={(e) => setForm((f) => ({ ...f, line1: e.target.value }))}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="line2">Apartment, suite, etc. (optional)</Label>
                  <Input
                    id="line2"
                    className="rounded-xl border-white/70 bg-white/65"
                    value={form.line2}
                    onChange={(e) => setForm((f) => ({ ...f, line2: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    required
                    className="rounded-xl border-white/70 bg-white/65"
                    value={form.city}
                    onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postal">Postal Code *</Label>
                  <Input
                    id="postal"
                    required
                    className="rounded-xl border-white/70 bg-white/65"
                    value={form.postalCode}
                    onChange={(e) => setForm((f) => ({ ...f, postalCode: e.target.value }))}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="region">Province / Region *</Label>
                  <Input
                    id="region"
                    required
                    className="rounded-xl border-white/70 bg-white/65"
                    value={form.region}
                    onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-[#2A4C6A]/75 sm:col-span-2">
                  <Checkbox
                    checked={saveInfo}
                    onCheckedChange={(checked) => setSaveInfo(checked === true)}
                  />
                  Save this information for next time
                </label>
              </div>
            </section>

            <section className="rounded-[2rem] border border-white/65 bg-white/55 p-5 shadow-[0_18px_55px_rgba(94,70,135,0.14)] backdrop-blur-xl sm:p-6">
              <h2 className="font-[family-name:var(--font-playfair-display)] text-xl font-semibold text-[#1e3157]">
                Shipping Method
              </h2>
              <div className="mt-4 space-y-3">
                {SHIPPING_OPTIONS.map((option) => {
                  const selected = shippingMethod === option.id;
                  return (
                    <label
                      key={option.id}
                      className={cn(
                        "flex cursor-pointer items-center justify-between gap-4 rounded-2xl border px-4 py-3 transition",
                        selected
                          ? "border-violet-300 bg-violet-50/80"
                          : "border-white/70 bg-white/50 hover:bg-white/70"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="shippingMethod"
                          checked={selected}
                          onChange={() => setShippingMethod(option.id)}
                          className="h-4 w-4 accent-[#6ea43f]"
                        />
                        <div>
                          <p className="text-sm font-semibold text-[#1e3157]">{option.title}</p>
                          <p className="text-xs text-[#2A4C6A]/65">{option.detail}</p>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-[#1e3157]">{money(option.price)}</span>
                    </label>
                  );
                })}
              </div>
            </section>
          </div>

          <div className="space-y-5 xl:sticky xl:top-24 xl:self-start">
            <section className="rounded-[2rem] border border-white/65 bg-white/55 p-5 shadow-[0_18px_55px_rgba(94,70,135,0.14)] backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="font-[family-name:var(--font-playfair-display)] text-2xl font-semibold text-[#1e3157]">
                  Order Summary
                </h2>
                <Link href="/cart" className="text-xs font-semibold text-[#6ea43f] hover:underline">
                  Edit Cart &gt;
                </Link>
              </div>
              <ul className="max-h-56 space-y-3 overflow-y-auto pr-1">
                {items.map((line) => {
                  const imageUrl = lineImage(line.image);
                  return (
                    <li
                      key={`${line.productId}-${line.variantId ?? ""}`}
                      className="flex gap-3 border-b border-white/50 pb-3 last:border-0 last:pb-0"
                    >
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-white/70 bg-white/60">
                        {isRemote(imageUrl) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Image src={imageUrl} alt="" fill className="object-cover" sizes="56px" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-semibold text-[#1e3157]">{line.name}</p>
                        <p className="text-xs text-[#2A4C6A]/65">
                          {line.variantName ?? "30ml"} · Qty {line.quantity}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-bold text-[#1e3157]">
                        {money(line.price * line.quantity)}
                      </p>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-4 space-y-2 border-t border-white/60 pt-4 text-sm">
                <div className="flex justify-between text-[#2A4C6A]/80">
                  <span>Subtotal</span>
                  <span className="font-semibold text-[#1e3157]">{money(subtotal)}</span>
                </div>
                {discountAmount > 0 ? (
                  <div className="flex justify-between text-green-700">
                    <span>Member discount ({memberDiscountPercent}%)</span>
                    <span className="font-semibold">−{money(discountAmount)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between text-[#2A4C6A]/80">
                  <span>Shipping</span>
                  <span className="font-semibold text-[#1e3157]">{money(shippingCost)}</span>
                </div>
                <div className="flex justify-between pt-2 text-lg font-bold text-[#6ea43f]">
                  <span>Total</span>
                  <span>{money(total)}</span>
                </div>
              </div>
            </section>

            <section className="rounded-[2rem] border border-white/65 bg-white/55 p-5 shadow-[0_18px_55px_rgba(94,70,135,0.14)] backdrop-blur-xl">
              <h2 className="font-[family-name:var(--font-playfair-display)] text-xl font-semibold text-[#1e3157]">
                Payment Method
              </h2>
              <div className="mt-4 space-y-3">
                {PAYMENT_OPTIONS.map((option) => {
                  const selected = form.paymentMethod === option.id;
                  return (
                    <label
                      key={option.id}
                      className={cn(
                        "flex cursor-pointer items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition",
                        selected
                          ? "border-violet-300 bg-violet-50/80"
                          : "border-white/70 bg-white/50 hover:bg-white/70"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="paymentMethod"
                          checked={selected}
                          onChange={() =>
                            setForm((f) => ({ ...f, paymentMethod: option.id }))
                          }
                          className="h-4 w-4 accent-[#6ea43f]"
                        />
                        <span className="text-sm font-semibold text-[#1e3157]">{option.label}</span>
                      </div>
                      <div className="flex gap-1">
                        {option.badges.map((badge) => (
                          <span
                            key={badge}
                            className="rounded-md border border-white/70 bg-white/65 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-[#2A4C6A]/60"
                          >
                            {badge}
                          </span>
                        ))}
                      </div>
                    </label>
                  );
                })}
              </div>

              <Button
                type="submit"
                className="mt-5 h-12 w-full rounded-xl bg-gradient-to-r from-[#6ea43f] to-[#477d34] text-white"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Placing order…
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    Proceed to Payment
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="mt-2 w-full text-[#2A4C6A]/70"
                asChild
              >
                <Link href="/cart">&lt; Back to Cart</Link>
              </Button>
            </section>
          </div>
        </div>
      </div>
    </form>
  );
}
