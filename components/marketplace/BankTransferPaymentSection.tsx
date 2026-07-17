"use client";

import { Building2, Copy } from "lucide-react";
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
import {
  MARKETPLACE_DEPOSIT_BANK_ACCOUNTS,
  PH_DEPOSITOR_BANKS,
} from "@/lib/constants/marketplaceBankAccounts";
import type { MarketplacePaymentMethod } from "@/lib/types/customerAccount";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export type BankTransferPaymentMode = "saved" | "new";

export interface BankTransferPaymentFields {
  mode: BankTransferPaymentMode;
  savedMethodId: string;
  depositorName: string;
  depositorBank: string;
  accountLast4: string;
  transferReference: string;
  depositToBankId: string;
  saveAccount: boolean;
}

interface BankTransferPaymentSectionProps {
  savedMethods: MarketplacePaymentMethod[];
  value: BankTransferPaymentFields;
  onChange: (next: BankTransferPaymentFields) => void;
  showSaveOption: boolean;
}

export function BankTransferPaymentSection({
  savedMethods,
  value,
  onChange,
  showSaveOption,
}: BankTransferPaymentSectionProps) {
  const { toast } = useToast();
  const bankMethods = savedMethods.filter((m) => m.type === "bank_transfer");
  const defaultDepositId =
    value.depositToBankId || MARKETPLACE_DEPOSIT_BANK_ACCOUNTS[0]?.id || "";

  function patch(partial: Partial<BankTransferPaymentFields>) {
    onChange({ ...value, ...partial });
  }

  async function copyText(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: `${label} copied` });
    } catch {
      toast({ title: "Could not copy", variant: "destructive" });
    }
  }

  return (
    <div className="mt-4 space-y-4 rounded-[10px] border border-amber-200/80 bg-amber-50/45 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-[#1e3157]">
        <Building2 className="h-4 w-4 text-amber-700" />
        Bank transfer
      </div>
      <p className="text-xs leading-5 text-[#2A4C6A]/75">
        Transfer the order total to one of our accounts below. Your order stays{" "}
        <span className="font-semibold text-amber-800">pending</span> until we confirm payment
        (usually within 1–2 business days).
      </p>

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#2A4C6A]/65">
          Deposit to
        </p>
        {MARKETPLACE_DEPOSIT_BANK_ACCOUNTS.map((account) => {
          const selected = (value.depositToBankId || defaultDepositId) === account.id;
          return (
            <div
              key={account.id}
              className={cn(
                "rounded-[10px] border p-3 transition",
                selected
                  ? "border-amber-400 bg-white/90"
                  : "border-white/70 bg-white/55"
              )}
            >
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="radio"
                  name="depositToBank"
                  checked={selected}
                  onChange={() => patch({ depositToBankId: account.id })}
                  className="mt-1 h-4 w-4 accent-[#6ea43f]"
                />
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-semibold text-[#1e3157]">{account.bankName}</p>
                  <p className="text-[#2A4C6A]/75">{account.accountName}</p>
                  <p className="font-mono text-xs text-[#1e3157]">{account.accountNumber}</p>
                  {account.branch ? (
                    <p className="text-xs text-[#2A4C6A]/60">{account.branch}</p>
                  ) : null}
                </div>
              </label>
              <ButtonCopyRow
                accountNumber={account.accountNumber}
                onCopy={(t) => void copyText(t, "Account number")}
              />
            </div>
          );
        })}
      </div>

      {bankMethods.length > 0 ? (
        <div className="space-y-2 border-t border-amber-200/60 pt-3">
          <p className="text-xs font-medium text-[#2A4C6A]/70">Your saved sending accounts</p>
          {bankMethods.map((method) => {
            const selected = value.mode === "saved" && value.savedMethodId === method.id;
            return (
              <label
                key={method.id}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-[10px] border px-3 py-2.5 transition",
                  selected
                    ? "border-amber-400 bg-white/90"
                    : "border-white/70 bg-white/60 hover:bg-white/80"
                )}
              >
                <input
                  type="radio"
                  name="savedBank"
                  checked={selected}
                  onChange={() => patch({ mode: "saved", savedMethodId: method.id })}
                  className="h-4 w-4 accent-[#6ea43f]"
                />
                <span className="text-sm text-[#1e3157]">{method.label}</span>
              </label>
            );
          })}
          <label
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-[10px] border px-3 py-2.5 transition",
              value.mode === "new"
                ? "border-amber-400 bg-white/90"
                : "border-white/70 bg-white/60 hover:bg-white/80"
            )}
          >
            <input
              type="radio"
              name="savedBank"
              checked={value.mode === "new"}
              onChange={() => patch({ mode: "new", savedMethodId: "" })}
              className="h-4 w-4 accent-[#6ea43f]"
            />
            <span className="text-sm text-[#1e3157]">Enter transfer details</span>
          </label>
        </div>
      ) : null}

      {value.mode === "new" || bankMethods.length === 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="depositorName">Name on your bank account</Label>
            <Input
              id="depositorName"
              className="rounded-[10px] border-white/70 bg-white/80"
              value={value.depositorName}
              onChange={(e) => patch({ depositorName: e.target.value })}
              placeholder="Account holder name"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Your bank</Label>
            <Select
              value={value.depositorBank || undefined}
              onValueChange={(v) => patch({ depositorBank: v })}
            >
              <SelectTrigger className="rounded-[10px] border-white/70 bg-white/80">
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
            <Label htmlFor="accountLast4">Last 4 digits of your account (optional)</Label>
            <Input
              id="accountLast4"
              className="rounded-[10px] border-white/70 bg-white/80 font-mono"
              value={value.accountLast4}
              onChange={(e) =>
                patch({ accountLast4: e.target.value.replace(/\D/g, "").slice(0, 4) })
              }
              placeholder="1234"
              maxLength={4}
              inputMode="numeric"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="transferReference">Transfer reference no.</Label>
            <Input
              id="transferReference"
              className="rounded-[10px] border-white/70 bg-white/80 font-mono"
              value={value.transferReference}
              onChange={(e) => patch({ transferReference: e.target.value })}
              placeholder="Reference from your bank app or receipt"
              required
              minLength={4}
            />
            <p className="text-xs text-[#2A4C6A]/65">
              Include this on your transfer so we can match your payment quickly.
            </p>
          </div>
          {showSaveOption ? (
            <label className="flex items-center gap-2 sm:col-span-2">
              <Checkbox
                checked={value.saveAccount}
                onCheckedChange={(c) => patch({ saveAccount: c === true })}
              />
              <span className="text-sm text-[#2A4C6A]/80">
                Save sending account for next time (last 4 digits only)
              </span>
            </label>
          ) : null}
        </div>
      ) : (
        <div className="space-y-1.5 border-t border-amber-200/60 pt-3">
          <Label htmlFor="transferReferenceSaved">Transfer reference no.</Label>
          <Input
            id="transferReferenceSaved"
            className="rounded-[10px] border-white/70 bg-white/80 font-mono"
            value={value.transferReference}
            onChange={(e) => patch({ transferReference: e.target.value })}
            placeholder="Reference from your bank app or receipt"
            required
            minLength={4}
          />
        </div>
      )}
    </div>
  );
}

function ButtonCopyRow({
  accountNumber,
  onCopy,
}: {
  accountNumber: string;
  onCopy: (text: string) => void;
}) {
  return (
    <button
      type="button"
      className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-amber-800 hover:underline"
      onClick={() => onCopy(accountNumber.replace(/\s/g, ""))}
    >
      <Copy className="h-3 w-3" />
      Copy account number
    </button>
  );
}
