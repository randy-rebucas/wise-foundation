"use client";

import { useState } from "react";
import { CreditCard, Plus, Star, Trash2, Wallet } from "lucide-react";
import { AccountPageHeader } from "@/components/marketplace/account/AccountPageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useMarketplacePaymentMethodsStore,
  type MarketplacePaymentMethod,
  type PaymentMethodType,
} from "@/store/marketplacePaymentMethodsStore";
import { cn } from "@/lib/utils";

const TYPE_LABELS: Record<PaymentMethodType, string> = {
  card: "Credit / Debit Card",
  gcash: "GCash",
  bank_transfer: "Bank Transfer",
};

function MethodIcon({ type }: { type: PaymentMethodType }) {
  if (type === "gcash") return <Wallet className="h-5 w-5" />;
  return <CreditCard className="h-5 w-5" />;
}

export default function AccountPaymentMethodsPage() {
  const items = useMarketplacePaymentMethodsStore((s) => s.items);
  const addMethod = useMarketplacePaymentMethodsStore((s) => s.addMethod);
  const removeMethod = useMarketplacePaymentMethodsStore((s) => s.removeMethod);
  const setDefault = useMarketplacePaymentMethodsStore((s) => s.setDefault);

  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<PaymentMethodType>("gcash");
  const [label, setLabel] = useState("");
  const [last4, setLast4] = useState("");

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    addMethod({
      type,
      label: label.trim() || TYPE_LABELS[type],
      last4: last4.trim() || undefined,
      isDefault: items.length === 0,
    });
    setLabel("");
    setLast4("");
    setShowForm(false);
  }

  return (
    <>
      <AccountPageHeader
        title="Payment Methods"
        description="Saved payment options for faster checkout. Display names only — no card numbers are stored."
      />

      <Button
        type="button"
        className="mt-6 rounded-xl bg-[#6ea43f] text-white hover:bg-[#5d9235]"
        onClick={() => setShowForm((v) => !v)}
      >
        <Plus className="mr-2 h-4 w-4" />
        Add payment method
      </Button>

      {showForm ? (
        <form
          onSubmit={handleAdd}
          className="mt-4 grid gap-4 rounded-2xl border border-white/65 bg-white/60 p-5 shadow-sm sm:grid-cols-2"
        >
          <div className="sm:col-span-2">
            <Label>Type</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {(Object.keys(TYPE_LABELS) as PaymentMethodType[]).map((t) => (
                <Button
                  key={t}
                  type="button"
                  size="sm"
                  variant={type === t ? "default" : "outline"}
                  className={cn(
                    "rounded-xl",
                    type === t ? "bg-violet-600 text-white" : "border-white/70 bg-white/65"
                  )}
                  onClick={() => setType(t)}
                >
                  {TYPE_LABELS[t]}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <Label htmlFor="label">Display name</Label>
            <Input
              id="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="My GCash"
              className="mt-1 rounded-xl border-white/70 bg-white/80"
            />
          </div>
          <div>
            <Label htmlFor="last4">Last 4 digits (optional)</Label>
            <Input
              id="last4"
              value={last4}
              onChange={(e) => setLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="1234"
              maxLength={4}
              className="mt-1 rounded-xl border-white/70 bg-white/80"
            />
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" className="rounded-xl bg-violet-600 text-white hover:bg-violet-700">
              Save method
            </Button>
            <Button type="button" variant="ghost" className="rounded-xl" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : null}

      {items.length === 0 ? (
        <p className="mt-8 text-sm text-[#2A4C6A]/70">No payment methods saved yet.</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {items.map((method: MarketplacePaymentMethod) => (
            <li
              key={method.id}
              className="flex flex-col gap-4 rounded-2xl border border-white/65 bg-white/60 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 text-violet-600">
                  <MethodIcon type={method.type} />
                </span>
                <div>
                  <p className="font-semibold text-[#1e3157]">
                    {method.label}
                    {method.isDefault ? (
                      <span className="ml-2 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                        Default
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-[#2A4C6A]/65">
                    {TYPE_LABELS[method.type]}
                    {method.last4 ? ` · •••• ${method.last4}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {!method.isDefault ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-xl text-xs"
                    onClick={() => setDefault(method.id)}
                  >
                    <Star className="mr-1 h-3.5 w-3.5" />
                    Set default
                  </Button>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="rounded-xl text-xs text-destructive"
                  onClick={() => removeMethod(method.id)}
                >
                  <Trash2 className="mr-1 h-3.5 w-3.5" />
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
