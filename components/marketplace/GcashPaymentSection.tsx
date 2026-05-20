"use client";

import { Wallet } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { MarketplacePaymentMethod } from "@/lib/types/customerAccount";
import { formatPhilippineMobileDisplay, maskPhilippineMobile } from "@/lib/utils/gcashPayment";
import { cn } from "@/lib/utils";

export type GcashPaymentMode = "saved" | "new";

export interface GcashPaymentFields {
  mode: GcashPaymentMode;
  savedMethodId: string;
  accountName: string;
  mobileNumber: string;
  saveWallet: boolean;
}

interface GcashPaymentSectionProps {
  savedMethods: MarketplacePaymentMethod[];
  value: GcashPaymentFields;
  onChange: (next: GcashPaymentFields) => void;
  showSaveOption: boolean;
}

export function GcashPaymentSection({
  savedMethods,
  value,
  onChange,
  showSaveOption,
}: GcashPaymentSectionProps) {
  const gcashMethods = savedMethods.filter((m) => m.type === "gcash");

  function patch(partial: Partial<GcashPaymentFields>) {
    onChange({ ...value, ...partial });
  }

  return (
    <div className="mt-4 space-y-4 rounded-2xl border border-sky-200/80 bg-sky-50/50 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-[#1e3157]">
        <Wallet className="h-4 w-4 text-sky-600" />
        GCash wallet
      </div>
      <p className="text-xs leading-5 text-[#2A4C6A]/70">
        You will receive payment instructions after placing your order. Use the mobile number linked
        to your GCash account.
      </p>

      {gcashMethods.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-[#2A4C6A]/70">Saved GCash accounts</p>
          {gcashMethods.map((method) => {
            const selected = value.mode === "saved" && value.savedMethodId === method.id;
            return (
              <label
                key={method.id}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition",
                  selected
                    ? "border-sky-400 bg-white/90"
                    : "border-white/70 bg-white/60 hover:bg-white/80"
                )}
              >
                <input
                  type="radio"
                  name="savedGcash"
                  checked={selected}
                  onChange={() => patch({ mode: "saved", savedMethodId: method.id })}
                  className="h-4 w-4 accent-[#6ea43f]"
                />
                <span className="text-sm text-[#1e3157]">
                  {method.label}
                  {method.last4 ? (
                    <span className="ml-1 text-[#2A4C6A]/60">· •••• {method.last4}</span>
                  ) : null}
                  {method.isDefault ? (
                    <span className="ml-2 text-[10px] font-semibold text-sky-600">Default</span>
                  ) : null}
                </span>
              </label>
            );
          })}
          <label
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition",
              value.mode === "new"
                ? "border-sky-400 bg-white/90"
                : "border-white/70 bg-white/60 hover:bg-white/80"
            )}
          >
            <input
              type="radio"
              name="savedGcash"
              checked={value.mode === "new"}
              onChange={() => patch({ mode: "new", savedMethodId: "" })}
              className="h-4 w-4 accent-[#6ea43f]"
            />
            <span className="text-sm text-[#1e3157]">Use a different GCash number</span>
          </label>
        </div>
      ) : null}

      {value.mode === "new" || gcashMethods.length === 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="gcashAccountName">Account name</Label>
            <Input
              id="gcashAccountName"
              className="rounded-xl border-white/70 bg-white/80"
              value={value.accountName}
              onChange={(e) => patch({ accountName: e.target.value })}
              placeholder="Name on GCash account"
              autoComplete="name"
              required
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="gcashMobile">GCash mobile number</Label>
            <Input
              id="gcashMobile"
              className="rounded-xl border-white/70 bg-white/80 font-mono"
              value={value.mobileNumber}
              onChange={(e) =>
                patch({ mobileNumber: formatPhilippineMobileDisplay(e.target.value) })
              }
              placeholder="0917 123 4567"
              inputMode="tel"
              autoComplete="tel"
              required
            />
            {value.mobileNumber.trim() ? (
              <p className="text-xs text-[#2A4C6A]/65">
                Display: {maskPhilippineMobile(value.mobileNumber)}
              </p>
            ) : null}
          </div>
          {showSaveOption ? (
            <label className="flex items-center gap-2 sm:col-span-2">
              <Checkbox
                checked={value.saveWallet}
                onCheckedChange={(c) => patch({ saveWallet: c === true })}
              />
              <span className="text-sm text-[#2A4C6A]/80">
                Save this GCash number for next time (last 4 digits only)
              </span>
            </label>
          ) : null}
        </div>
      ) : null}

      <p className="text-[11px] leading-5 text-[#2A4C6A]/60">
        Full mobile numbers are not stored. We only keep the last 4 digits for your reference.
      </p>
    </div>
  );
}
