"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, MapPin, Plus, Star, Trash2 } from "lucide-react";
import { AccountPageHeader } from "@/components/marketplace/account/AccountPageHeader";
import { useConfirm } from "@/components/providers/confirm-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { MarketplaceSavedAddress } from "@/lib/types/customerAccount";
import { cn } from "@/lib/utils";

type OrderAddress = {
  id: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  region: string;
  postalCode: string;
  lastUsedAt: string;
};

const EMPTY_FORM = {
  label: "Home",
  fullName: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  region: "",
  postalCode: "",
};

function AddressCard({
  title,
  address,
  badge,
  onRemove,
  onSetDefault,
}: {
  title: string;
  address: {
    fullName: string;
    phone: string;
    line1: string;
    line2?: string;
    city: string;
    region: string;
    postalCode: string;
  };
  badge?: string;
  onRemove?: () => void;
  onSetDefault?: () => void;
}) {
  return (
    <li className="rounded-2xl border border-white/65 bg-white/60 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 font-semibold text-[#1e3157]">
            <MapPin className="h-4 w-4 text-[#6ea43f]" />
            {title}
            {badge ? (
              <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                {badge}
              </span>
            ) : null}
          </p>
          <p className="mt-2 text-sm text-[#2A4C6A]/80">{address.fullName}</p>
          <p className="text-sm text-[#2A4C6A]/70">{address.phone}</p>
          <p className="mt-1 text-sm text-[#2A4C6A]/75">
            {address.line1}
            {address.line2 ? `, ${address.line2}` : ""}
            <br />
            {address.city}, {address.region} {address.postalCode}
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2">
          {onSetDefault ? (
            <Button type="button" size="sm" variant="outline" className="rounded-xl text-xs" onClick={onSetDefault}>
              <Star className="mr-1 h-3.5 w-3.5" />
              Default
            </Button>
          ) : null}
          {onRemove ? (
            <Button type="button" size="sm" variant="ghost" className="rounded-xl text-xs text-destructive" onClick={onRemove}>
              <Trash2 className="mr-1 h-3.5 w-3.5" />
              Remove
            </Button>
          ) : null}
        </div>
      </div>
    </li>
  );
}

export default function AccountAddressesPage() {
  const confirm = useConfirm();
  const [saved, setSaved] = useState<MarketplaceSavedAddress[]>([]);
  const [fromOrders, setFromOrders] = useState<OrderAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const load = useCallback(async () => {
    setError("");
    try {
      const [savedRes, ordersRes] = await Promise.all([
        fetch("/api/account/saved-addresses"),
        fetch("/api/account/addresses"),
      ]);
      const savedJson = await savedRes.json();
      const ordersJson = await ordersRes.json();
      if (savedRes.ok && savedJson.success) {
        setSaved(savedJson.data as MarketplaceSavedAddress[]);
      }
      if (ordersRes.ok && ordersJson.success) {
        setFromOrders(ordersJson.data as OrderAddress[]);
      }
    } catch {
      setError("Could not load addresses");
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
    try {
      const res = await fetch("/api/account/saved-addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, line2: form.line2 || undefined }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error ?? "Could not save address");
        return;
      }
      setSaved(json.data as MarketplaceSavedAddress[]);
      setForm(EMPTY_FORM);
      setShowForm(false);
    } catch {
      setError("Could not save address");
    } finally {
      setSaving(false);
    }
  }

  async function removeSaved(id: string) {
    const ok = await confirm({
      title: "Remove this address?",
      variant: "destructive",
    });
    if (!ok) return;
    const res = await fetch(`/api/account/saved-addresses?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    const json = await res.json();
    if (res.ok && json.success) setSaved(json.data as MarketplaceSavedAddress[]);
  }

  async function setDefault(id: string) {
    const res = await fetch("/api/account/saved-addresses", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addressId: id, action: "setDefault" }),
    });
    const json = await res.json();
    if (res.ok && json.success) setSaved(json.data as MarketplaceSavedAddress[]);
  }

  return (
    <>
      <AccountPageHeader
        title="My Addresses"
        description="Saved delivery addresses and addresses from past orders."
      />

      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}

      <div className="mt-6 flex flex-wrap gap-3">
        <Button
          type="button"
          className="rounded-xl bg-[#6ea43f] text-white hover:bg-[#5d9235]"
          onClick={() => setShowForm((v) => !v)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add new address
        </Button>
      </div>

      {showForm ? (
        <form
          onSubmit={handleAdd}
          className="mt-4 grid gap-4 rounded-2xl border border-white/65 bg-white/60 p-5 shadow-sm sm:grid-cols-2"
        >
          {(
            [
              ["label", "Label", "Home"],
              ["fullName", "Full name", "Jane Doe"],
              ["phone", "Phone", "+63 912 345 6789"],
              ["line1", "Address line 1", "123 Main St"],
              ["line2", "Address line 2 (optional)", ""],
              ["city", "City", "Makati"],
              ["region", "Region", "Metro Manila"],
              ["postalCode", "Postal code", "1200"],
            ] as const
          ).map(([key, label, placeholder]) => (
            <div key={key} className={cn(key === "line1" || key === "line2" ? "sm:col-span-2" : "")}>
              <Label htmlFor={key}>{label}</Label>
              <Input
                id={key}
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                required={key !== "line2"}
                className="mt-1 rounded-xl border-white/70 bg-white/80"
              />
            </div>
          ))}
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" disabled={saving} className="rounded-xl bg-violet-600 text-white hover:bg-violet-700">
              {saving ? "Saving…" : "Save address"}
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
      ) : (
        <>
          <section className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[#2A4C6A]/60">Saved addresses</h2>
            {saved.length === 0 ? (
              <p className="mt-3 text-sm text-[#2A4C6A]/70">No saved addresses yet.</p>
            ) : (
              <ul className="mt-4 space-y-4">
                {saved.map((addr) => (
                  <AddressCard
                    key={addr.id}
                    title={addr.label}
                    address={addr}
                    badge={addr.isDefault ? "Default" : undefined}
                    onRemove={() => void removeSaved(addr.id)}
                    onSetDefault={addr.isDefault ? undefined : () => void setDefault(addr.id)}
                  />
                ))}
              </ul>
            )}
          </section>

          <section className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[#2A4C6A]/60">From past orders</h2>
            {fromOrders.length === 0 ? (
              <p className="mt-3 text-sm text-[#2A4C6A]/70">No addresses from orders yet.</p>
            ) : (
              <ul className="mt-4 space-y-4">
                {fromOrders.map((addr) => (
                  <AddressCard key={addr.id} title="Delivery address" address={addr} />
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </>
  );
}
