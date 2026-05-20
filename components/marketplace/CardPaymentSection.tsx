"use client";

import { CreditCard } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { MarketplacePaymentMethod } from "@/lib/types/customerAccount";
import {
  cardBrandLabel,
  cvvMaxLength,
  detectCardBrand,
  formatCardNumberDisplay,
} from "@/lib/utils/cardPayment";
import { cn } from "@/lib/utils";

export type CardPaymentMode = "saved" | "new";

export interface CardPaymentFields {
  mode: CardPaymentMode;
  savedMethodId: string;
  cardholderName: string;
  cardNumber: string;
  expMonth: string;
  expYear: string;
  cvv: string;
  saveCard: boolean;
}

interface CardPaymentSectionProps {
  savedMethods: MarketplacePaymentMethod[];
  value: CardPaymentFields;
  onChange: (next: CardPaymentFields) => void;
  showSaveOption: boolean;
}

export function CardPaymentSection({
  savedMethods,
  value,
  onChange,
  showSaveOption,
}: CardPaymentSectionProps) {
  const cardMethods = savedMethods.filter((m) => m.type === "card");
  const brand = detectCardBrand(value.cardNumber);

  function patch(partial: Partial<CardPaymentFields>) {
    onChange({ ...value, ...partial });
  }

  return (
    <div className="mt-4 space-y-4 rounded-2xl border border-violet-200/80 bg-violet-50/40 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-[#1e3157]">
        <CreditCard className="h-4 w-4 text-violet-600" />
        Card details
      </div>

      {cardMethods.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-[#2A4C6A]/70">Saved cards</p>
          {cardMethods.map((method) => {
            const selected = value.mode === "saved" && value.savedMethodId === method.id;
            return (
              <label
                key={method.id}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition",
                  selected
                    ? "border-violet-400 bg-white/90"
                    : "border-white/70 bg-white/60 hover:bg-white/80"
                )}
              >
                <input
                  type="radio"
                  name="savedCard"
                  checked={selected}
                  onChange={() =>
                    patch({ mode: "saved", savedMethodId: method.id })
                  }
                  className="h-4 w-4 accent-[#6ea43f]"
                />
                <span className="text-sm text-[#1e3157]">
                  {method.label}
                  {method.isDefault ? (
                    <span className="ml-2 text-[10px] font-semibold text-violet-600">Default</span>
                  ) : null}
                </span>
              </label>
            );
          })}
          <label
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition",
              value.mode === "new"
                ? "border-violet-400 bg-white/90"
                : "border-white/70 bg-white/60 hover:bg-white/80"
            )}
          >
            <input
              type="radio"
              name="savedCard"
              checked={value.mode === "new"}
              onChange={() => patch({ mode: "new", savedMethodId: "" })}
              className="h-4 w-4 accent-[#6ea43f]"
            />
            <span className="text-sm text-[#1e3157]">Use a different card</span>
          </label>
        </div>
      ) : null}

      {value.mode === "new" || cardMethods.length === 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="cardholderName">Name on card</Label>
            <Input
              id="cardholderName"
              className="rounded-xl border-white/70 bg-white/80"
              value={value.cardholderName}
              onChange={(e) => patch({ cardholderName: e.target.value })}
              placeholder="As shown on card"
              autoComplete="cc-name"
              required
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="cardNumber">Card number</Label>
            <Input
              id="cardNumber"
              className="rounded-xl border-white/70 bg-white/80 font-mono"
              value={value.cardNumber}
              onChange={(e) =>
                patch({ cardNumber: formatCardNumberDisplay(e.target.value) })
              }
              placeholder="4111 1111 1111 1111"
              inputMode="numeric"
              autoComplete="cc-number"
              required
            />
            {value.cardNumber.trim() ? (
              <p className="text-xs text-[#2A4C6A]/65">{cardBrandLabel(brand)}</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="expMonth">Expiry month</Label>
            <Input
              id="expMonth"
              className="rounded-xl border-white/70 bg-white/80"
              value={value.expMonth}
              onChange={(e) =>
                patch({ expMonth: e.target.value.replace(/\D/g, "").slice(0, 2) })
              }
              placeholder="MM"
              maxLength={2}
              inputMode="numeric"
              autoComplete="cc-exp-month"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="expYear">Expiry year</Label>
            <Input
              id="expYear"
              className="rounded-xl border-white/70 bg-white/80"
              value={value.expYear}
              onChange={(e) =>
                patch({ expYear: e.target.value.replace(/\D/g, "").slice(0, 2) })
              }
              placeholder="YY"
              maxLength={2}
              inputMode="numeric"
              autoComplete="cc-exp-year"
              required
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="cvv">Security code (CVV)</Label>
            <Input
              id="cvv"
              className="max-w-[140px] rounded-xl border-white/70 bg-white/80 font-mono"
              value={value.cvv}
              onChange={(e) =>
                patch({ cvv: e.target.value.replace(/\D/g, "").slice(0, cvvMaxLength(brand)) })
              }
              placeholder={brand === "amex" ? "1234" : "123"}
              maxLength={cvvMaxLength(brand)}
              inputMode="numeric"
              autoComplete="cc-csc"
              required
            />
          </div>
          {showSaveOption ? (
            <label className="flex items-center gap-2 sm:col-span-2">
              <Checkbox
                checked={value.saveCard}
                onCheckedChange={(c) => patch({ saveCard: c === true })}
              />
              <span className="text-sm text-[#2A4C6A]/80">Save this card for next time (last 4 digits only)</span>
            </label>
          ) : null}
        </div>
      ) : null}

      <p className="text-[11px] leading-5 text-[#2A4C6A]/60">
        Payments are processed securely. Full card numbers are not stored on our servers.
      </p>
    </div>
  );
}
