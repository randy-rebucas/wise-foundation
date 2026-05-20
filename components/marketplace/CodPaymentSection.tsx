"use client";

import { Banknote } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MARKETPLACE_COD_MIN_ORDER,
  MARKETPLACE_COD_TERMS,
} from "@/lib/constants/marketplaceCod";
import { useFormatCurrency } from "@/components/providers/TenantProvider";

export interface CodPaymentFields {
  acknowledged: boolean;
  prepareChangeFor: string;
}

interface CodPaymentSectionProps {
  amountDue: number;
  value: CodPaymentFields;
  onChange: (next: CodPaymentFields) => void;
}

export function CodPaymentSection({ amountDue, value, onChange }: CodPaymentSectionProps) {
  const money = useFormatCurrency();
  const prepareNum = parseFloat(value.prepareChangeFor.replace(/,/g, ""));
  const changePreview =
    Number.isFinite(prepareNum) && prepareNum >= amountDue
      ? Math.round((prepareNum - amountDue) * 100) / 100
      : null;

  function patch(partial: Partial<CodPaymentFields>) {
    onChange({ ...value, ...partial });
  }

  const belowMin = amountDue < MARKETPLACE_COD_MIN_ORDER;

  return (
    <div className="mt-4 space-y-4 rounded-2xl border border-emerald-200/80 bg-emerald-50/45 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-[#1e3157]">
        <Banknote className="h-4 w-4 text-emerald-700" />
        Cash on delivery
      </div>

      <div className="rounded-xl border border-white/70 bg-white/80 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#2A4C6A]/65">
          Amount to prepare
        </p>
        <p className="mt-1 font-[family-name:var(--font-playfair-display)] text-2xl font-semibold text-[#6ea43f]">
          {money(amountDue)}
        </p>
        <p className="mt-1 text-xs text-[#2A4C6A]/70">Pay this exact amount when your order is delivered.</p>
      </div>

      {belowMin ? (
        <p className="text-sm text-destructive">
          Cash on delivery is available for orders of {money(MARKETPLACE_COD_MIN_ORDER)} or more.
        </p>
      ) : null}

      <ul className="space-y-2 text-xs leading-5 text-[#2A4C6A]/75">
        {MARKETPLACE_COD_TERMS.map((line) => (
          <li key={line} className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#6ea43f]" />
            <span>{line}</span>
          </li>
        ))}
      </ul>

      <div className="space-y-1.5">
        <Label htmlFor="prepareChangeFor">I will pay with (optional)</Label>
        <Input
          id="prepareChangeFor"
          type="number"
          min={amountDue}
          step={1}
          className="max-w-xs rounded-xl border-white/70 bg-white/80"
          value={value.prepareChangeFor}
          onChange={(e) => patch({ prepareChangeFor: e.target.value })}
          placeholder={String(Math.ceil(amountDue / 100) * 100)}
        />
        <p className="text-xs text-[#2A4C6A]/65">
          Helps our courier prepare change. Leave blank if paying exact amount.
        </p>
        {changePreview !== null && changePreview > 0 ? (
          <p className="text-xs font-semibold text-emerald-800">
            Change to receive: {money(changePreview)}
          </p>
        ) : null}
      </div>

      <label className="flex items-start gap-3 rounded-xl border border-white/70 bg-white/60 px-3 py-3">
        <Checkbox
          checked={value.acknowledged}
          onCheckedChange={(c) => patch({ acknowledged: c === true })}
          className="mt-0.5"
        />
        <span className="text-sm leading-6 text-[#2A4C6A]/85">
          I understand I will pay{" "}
          <span className="font-semibold text-[#1e3157]">{money(amountDue)}</span> in cash on delivery,
          and someone will be available to receive the package.
        </span>
      </label>
    </div>
  );
}
