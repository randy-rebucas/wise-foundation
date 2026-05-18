"use client";

import { useCallback, useEffect, useState } from "react";
import { MapPin, Plus, Star, Trash2 } from "lucide-react";
import { AccountPageHeader } from "@/components/marketplace/account/AccountPageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useMarketplaceAddressesStore,
  type MarketplaceSavedAddress,
} from "@/store/marketplaceAddressesStore";
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

export default function AccountAddressesPage() {
  const saved = useMarketplaceAddressesStore((s) => s.items);
  const addAddress = useMarketplaceAddressesStore((s) => s.addAddress);
  const removeAddress = useMarketplaceAddressesStore((s) => s.removeAddress);
  const setDefault = useMarketplaceAddressesStore((s) => s.setDefault);

  const [fromOrders, setFromOrders] = useState<OrderAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const loadOrderAddresses = useCallback(async () => {
    try {
      const res = await fetch("/api/account/addresses");
      const json = await res.json();
      if (res.ok && json.success) {
        setFromOrders(json.data as OrderAddress[]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void loadOrderAddresses();
    });
  }, [loadOrderAddresses]);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    addAddress({
      ...form,
      line2: form.line2 || undefined,
      isDefault: saved.length === 0,
    });
    setForm(EMPTY_FORM);
    setShowForm(false);
  }

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

  return (
    <>
      <AccountPageHeader
        title="My Addresses"
        description="Saved delivery addresses and addresses from past orders."
      />

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
            <Button type="submit" className="rounded-xl bg-violet-600 text-white hover:bg-violet-700">
              Save address
            </Button>
            <Button type="button" variant="ghost" className="rounded-xl" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : null}

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[#2A4C6A]/60">Saved addresses</h2>
        {saved.length === 0 ? (
          <p className="mt-3 text-sm text-[#2A4C6A]/70">No saved addresses yet.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {saved.map((addr: MarketplaceSavedAddress) => (
              <AddressCard
                key={addr.id}
                title={addr.label}
                address={addr}
                badge={addr.isDefault ? "Default" : undefined}
                onRemove={() => removeAddress(addr.id)}
                onSetDefault={addr.isDefault ? undefined : () => setDefault(addr.id)}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[#2A4C6A]/60">
          From past orders
        </h2>
        {loading ? (
          <p className="mt-3 text-sm text-[#2A4C6A]/70">Loading…</p>
        ) : fromOrders.length === 0 ? (
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
  );
}
