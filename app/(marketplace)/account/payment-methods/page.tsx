"use client";

import { useCallback, useEffect, useState } from "react";
import { CreditCard, Loader2, Plus, Star, Trash2, Wallet } from "lucide-react";
import { AccountPageHeader } from "@/components/marketplace/account/AccountPageHeader";
import { useConfirm } from "@/components/providers/confirm-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MarketplacePaymentMethod, PaymentMethodType } from "@/lib/types/customerAccount";
import {
  cardBrandLabel,
  detectCardBrand,
  digitsOnly,
  formatCardNumberDisplay,
  isValidCardNumber,
} from "@/lib/utils/cardPayment";
import {
  formatPhilippineMobileDisplay,
  normalizePhilippineMobile,
} from "@/lib/utils/gcashPayment";
import { PH_DEPOSITOR_BANKS } from "@/lib/constants/marketplaceBankAccounts";
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
  const confirm = useConfirm();
  const [items, setItems] = useState<MarketplacePaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<PaymentMethodType>("card");
  const [label, setLabel] = useState("");
  const [last4, setLast4] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [gcashAccountName, setGcashAccountName] = useState("");
  const [gcashMobile, setGcashMobile] = useState("");
  const [bankDepositorName, setBankDepositorName] = useState("");
  const [bankDepositorBank, setBankDepositorBank] = useState("");
  const [bankAccountLast4, setBankAccountLast4] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await fetch("/api/account/payment-methods");
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error ?? "Could not load payment methods");
        setItems([]);
        return;
      }
      setItems(json.data as MarketplacePaymentMethod[]);
    } catch {
      setError("Could not load payment methods");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    let resolvedLast4 = last4.trim();
    let resolvedLabel = label.trim();

    if (type === "card") {
      const digits = digitsOnly(cardNumber);
      if (!isValidCardNumber(digits)) {
        setError("Enter a valid card number");
        setSaving(false);
        return;
      }
      const brand = detectCardBrand(digits);
      resolvedLast4 = digits.slice(-4);
      const name = cardholderName.trim() || "Card";
      resolvedLabel =
        resolvedLabel || `${cardBrandLabel(brand)} •••• ${resolvedLast4} (${name})`;
    }

    if (type === "gcash") {
      const normalized = normalizePhilippineMobile(gcashMobile);
      if (!normalized) {
        setError("Enter a valid GCash mobile number (09XX XXX XXXX)");
        setSaving(false);
        return;
      }
      resolvedLast4 = normalized.slice(-4);
      const name = gcashAccountName.trim() || "GCash";
      resolvedLabel = resolvedLabel || `GCash •••• ${resolvedLast4} (${name})`;
    }

    if (type === "bank_transfer") {
      const name = bankDepositorName.trim();
      const bank = bankDepositorBank.trim();
      const last4 = bankAccountLast4.replace(/\D/g, "").slice(-4);
      if (name.length < 2 || !bank) {
        setError("Enter account name and bank");
        setSaving(false);
        return;
      }
      if (last4.length !== 4) {
        setError("Enter the last 4 digits of your account");
        setSaving(false);
        return;
      }
      resolvedLast4 = last4;
      resolvedLabel = resolvedLabel || `${bank} •••• ${last4} (${name})`;
    }

    try {
      const res = await fetch("/api/account/payment-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          label: resolvedLabel || TYPE_LABELS[type],
          last4: resolvedLast4 || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error ?? "Could not save");
        return;
      }
      setItems(json.data as MarketplacePaymentMethod[]);
      setLabel("");
      setLast4("");
      setCardNumber("");
      setCardholderName("");
      setGcashAccountName("");
      setGcashMobile("");
      setBankDepositorName("");
      setBankDepositorBank("");
      setBankAccountLast4("");
      setShowForm(false);
    } catch {
      setError("Could not save");
    } finally {
      setSaving(false);
    }
  }

  async function removeMethod(id: string) {
    const ok = await confirm({
      title: "Remove this payment method?",
      variant: "destructive",
    });
    if (!ok) return;
    const res = await fetch(`/api/account/payment-methods?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    const json = await res.json();
    if (res.ok && json.success) setItems(json.data as MarketplacePaymentMethod[]);
  }

  async function setDefault(id: string) {
    const res = await fetch("/api/account/payment-methods", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ methodId: id }),
    });
    const json = await res.json();
    if (res.ok && json.success) setItems(json.data as MarketplacePaymentMethod[]);
  }

  return (
    <>
      <AccountPageHeader
        title="Payment Methods"
        description="Saved payment options for faster checkout. Only labels and last 4 digits are stored — never full card numbers or mobile numbers."
      />

      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}

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
          {type === "gcash" ? (
            <>
              <div className="sm:col-span-2">
                <Label htmlFor="gcashAccountName">Account name</Label>
                <Input
                  id="gcashAccountName"
                  value={gcashAccountName}
                  onChange={(e) => setGcashAccountName(e.target.value)}
                  placeholder="Name on GCash"
                  className="mt-1 rounded-xl border-white/70 bg-white/80"
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="gcashMobile">GCash mobile number</Label>
                <Input
                  id="gcashMobile"
                  value={gcashMobile}
                  onChange={(e) => setGcashMobile(formatPhilippineMobileDisplay(e.target.value))}
                  placeholder="0917 123 4567"
                  inputMode="tel"
                  className="mt-1 rounded-xl border-white/70 bg-white/80 font-mono"
                />
                <p className="mt-1 text-xs text-[#2A4C6A]/65">
                  Only the last 4 digits of your mobile number are saved.
                </p>
              </div>
            </>
          ) : null}
          {type === "card" ? (
            <>
              <div className="sm:col-span-2">
                <Label htmlFor="cardholderName">Name on card</Label>
                <Input
                  id="cardholderName"
                  value={cardholderName}
                  onChange={(e) => setCardholderName(e.target.value)}
                  placeholder="Jane Doe"
                  className="mt-1 rounded-xl border-white/70 bg-white/80"
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="cardNumber">Card number</Label>
                <Input
                  id="cardNumber"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumberDisplay(e.target.value))}
                  placeholder="4111 1111 1111 1111"
                  inputMode="numeric"
                  className="mt-1 rounded-xl border-white/70 bg-white/80 font-mono"
                />
                <p className="mt-1 text-xs text-[#2A4C6A]/65">
                  Only the last 4 digits are saved — never the full number.
                </p>
              </div>
            </>
          ) : null}
          {type === "bank_transfer" ? (
            <>
              <div className="sm:col-span-2">
                <Label htmlFor="bankDepositorName">Account name</Label>
                <Input
                  id="bankDepositorName"
                  value={bankDepositorName}
                  onChange={(e) => setBankDepositorName(e.target.value)}
                  placeholder="Name on bank account"
                  className="mt-1 rounded-xl border-white/70 bg-white/80"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Your bank</Label>
                <Select value={bankDepositorBank || undefined} onValueChange={setBankDepositorBank}>
                  <SelectTrigger className="rounded-xl border-white/70 bg-white/80">
                    <SelectValue placeholder="Select bank" />
                  </SelectTrigger>
                  <SelectContent>
                    {PH_DEPOSITOR_BANKS.map((bank) => (
                      <SelectItem key={bank} value={bank}>
                        {bank}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bankAccountLast4">Last 4 digits of account</Label>
                <Input
                  id="bankAccountLast4"
                  value={bankAccountLast4}
                  onChange={(e) =>
                    setBankAccountLast4(e.target.value.replace(/\D/g, "").slice(0, 4))
                  }
                  placeholder="1234"
                  maxLength={4}
                  inputMode="numeric"
                  className="mt-1 rounded-xl border-white/70 bg-white/80 font-mono"
                />
              </div>
            </>
          ) : null}
          <div>
            <Label htmlFor="label">Display name (optional)</Label>
            <Input
              id="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={
                type === "card"
                  ? "Auto-filled from card"
                  : type === "gcash"
                    ? "Auto-filled from GCash"
                    : type === "bank_transfer"
                      ? "Auto-filled from bank"
                      : "My account"
              }
              className="mt-1 rounded-xl border-white/70 bg-white/80"
            />
          </div>
          {type !== "card" && type !== "gcash" ? (
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
          ) : null}
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" disabled={saving} className="rounded-xl bg-violet-600 text-white hover:bg-violet-700">
              {saving ? "Saving…" : "Save method"}
            </Button>
            <Button type="button" variant="ghost" className="rounded-xl" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : null}

      {loading ? (
        <div className="mt-8 flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-[#6ea43f]" />
        </div>
      ) : items.length === 0 ? (
        <p className="mt-8 text-sm text-[#2A4C6A]/70">No payment methods saved yet.</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {items.map((method) => (
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
                    onClick={() => void setDefault(method.id)}
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
                  onClick={() => void removeMethod(method.id)}
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
