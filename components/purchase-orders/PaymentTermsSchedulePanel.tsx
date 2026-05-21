"use client";

import { computePaymentTermsSchedule } from "@/lib/utils/purchaseOrderTotals";
import type { PurchaseOrderPaymentTermsMonths } from "@/lib/utils/purchaseOrderTotals";

type PaymentTermsSchedulePanelProps = {
  total: number;
  paymentTermsMonths?: PurchaseOrderPaymentTermsMonths | null;
  termsStartDate?: Date | string | null;
  formatMoney: (amount: number) => string;
  formatDate: (isoDate: string) => string;
  className?: string;
};

export function PaymentTermsSchedulePanel({
  total,
  paymentTermsMonths,
  termsStartDate,
  formatMoney,
  formatDate,
  className,
}: PaymentTermsSchedulePanelProps) {
  const schedule = computePaymentTermsSchedule({
    total,
    paymentTermsMonths,
    termsStartDate,
  });

  if (!schedule) return null;

  return (
    <div className={className ?? "rounded-lg border bg-muted/30 p-3 space-y-2 sm:col-span-2"}>
      <div>
        <p className="text-sm font-medium">Payment schedule</p>
        <p className="text-xs text-muted-foreground">
          {schedule.cadenceLabel === "weekly"
            ? `Full balance due ${formatDate(schedule.finalDueDate)} (7 days from terms start)`
            : `${schedule.installments.length} monthly installments from ${formatMoney(schedule.installmentAmount)} per month · Final due ${formatDate(schedule.finalDueDate)}`}
        </p>
      </div>
      <div className="overflow-x-auto rounded-md border bg-background">
        <table className="w-full min-w-[16rem] text-sm">
          <thead className="bg-muted/60">
            <tr>
              <th className="px-3 py-2 text-left font-medium">#</th>
              <th className="px-3 py-2 text-left font-medium">Due date</th>
              <th className="px-3 py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {schedule.installments.map((row) => (
              <tr key={row.installmentNumber}>
                <td className="px-3 py-2 text-muted-foreground">{row.installmentNumber}</td>
                <td className="px-3 py-2">{formatDate(row.dueDate)}</td>
                <td className="px-3 py-2 text-right font-medium">{formatMoney(row.amount)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t bg-muted/40">
            <tr>
              <td colSpan={2} className="px-3 py-2 text-right font-semibold">
                Total
              </td>
              <td className="px-3 py-2 text-right font-bold">{formatMoney(schedule.total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
