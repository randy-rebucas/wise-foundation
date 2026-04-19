"use client";

import { useState } from "react";
import { useCartStore } from "@/store/cartStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, Loader2, Printer } from "lucide-react";
import { formatCurrency } from "@/lib/utils";


interface CheckoutModalProps {
  open: boolean;
  onClose: () => void;
  branchId: string;
}

type PaymentMethod = "cash" | "gcash" | "card" | "bank_transfer" | "credit";

interface OrderResult {
  orderNumber: string;
  subtotal: number;
  discountAmount: number;
  total: number;
  change: number;
  paymentMethod: string;
}

function printReceipt(result: OrderResult, items: ReturnType<typeof useCartStore.getState>["items"], memberName: string | null, discountPercent: number) {
  const w = window.open("", "_blank", "width=400,height=600");
  if (!w) return;
  const lines = items
    .map(
      (i) =>
        `<tr><td>${i.name}<br/><small>${i.sku}</small></td><td style="text-align:right">${i.quantity}</td><td style="text-align:right">₱${(i.price * i.quantity).toFixed(2)}</td></tr>`
    )
    .join("");
  w.document.write(`<!DOCTYPE html><html><head><title>Receipt</title>
  <style>
    body{font-family:monospace;font-size:13px;width:320px;margin:0 auto;padding:16px}
    h2{text-align:center;margin:0 0 4px}
    p{text-align:center;margin:2px 0;font-size:11px}
    table{width:100%;border-collapse:collapse;margin:8px 0}
    td{padding:3px 0;vertical-align:top}
    hr{border:none;border-top:1px dashed #999;margin:8px 0}
    .total{font-weight:bold;font-size:15px}
    .change{color:#16a34a;font-weight:bold}
    @media print{button{display:none}}
  </style></head><body>
  <h2>Livelihood POS</h2>
  <p>${new Date().toLocaleString()}</p>
  <p>Order: <strong>${result.orderNumber}</strong></p>
  ${memberName ? `<p>Member: ${memberName} (${discountPercent}% off)</p>` : ""}
  <hr/>
  <table><thead><tr><th style="text-align:left">Item</th><th style="text-align:right">Qty</th><th style="text-align:right">Amount</th></tr></thead>
  <tbody>${lines}</tbody></table>
  <hr/>
  <table>
    <tr><td>Subtotal</td><td style="text-align:right">₱${result.subtotal.toFixed(2)}</td></tr>
    ${result.discountAmount > 0 ? `<tr><td>Discount</td><td style="text-align:right">-₱${result.discountAmount.toFixed(2)}</td></tr>` : ""}
    <tr class="total"><td>Total</td><td style="text-align:right">₱${result.total.toFixed(2)}</td></tr>
    ${result.paymentMethod === "cash" && result.change > 0 ? `<tr class="change"><td>Change</td><td style="text-align:right">₱${result.change.toFixed(2)}</td></tr>` : ""}
  </table>
  <hr/>
  <p>Payment: ${result.paymentMethod.toUpperCase()}</p>
  <p style="margin-top:12px">Thank you for your purchase!</p>
  <br/><button onclick="window.print()">Print</button>
  </body></html>`);
  w.document.close();
  w.focus();
  w.print();
}

export function CheckoutModal({ open, onClose, branchId }: CheckoutModalProps) {
  const { items, memberId, memberName, discountPercent, getSubtotal, getDiscount, getTotal, clearCart } =
    useCartStore();
  

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [amountPaid, setAmountPaid] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<OrderResult | null>(null);

  const subtotal = getSubtotal();
  const discount = getDiscount();
  const total = getTotal();
  const paid = parseFloat(amountPaid) || 0;
  const change = Math.max(0, paid - total);

  async function handleConfirm() {
    if (paymentMethod === "cash" && paid < total) {
      setError("Amount paid is insufficient");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          memberId,
          discountPercent,
          paymentMethod,
          amountPaid: paymentMethod === "cash" ? paid : total,
          notes,
          branchId,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error);
      } else {
        setResult(data.data);
        clearCart();
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setResult(null);
    setAmountPaid("");
    setNotes("");
    setError("");
    setPaymentMethod("cash");
    onClose();
  }

  // Success screen
  if (result) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-sm text-center">
          <div className="py-6 space-y-4">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <div>
              <h2 className="text-2xl font-bold">Payment Complete!</h2>
              <p className="text-muted-foreground text-sm mt-1">{result.orderNumber}</p>
            </div>
            <div className="bg-muted rounded-lg p-4 text-left space-y-2">
              <div className="flex justify-between text-sm">
                <span>Total</span>
                <span className="font-semibold">{formatCurrency(result.total)}</span>
              </div>
              {result.paymentMethod === "cash" && result.change > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Change</span>
                  <span className="font-semibold">{formatCurrency(result.change)}</span>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => printReceipt(result, items, memberName, discountPercent)}
              >
                <Printer className="h-4 w-4 mr-2" />
                Print Receipt
              </Button>
              <Button className="flex-1" onClick={handleClose}>
                New Sale
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Complete Payment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Order Summary */}
          <div className="bg-muted rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Items</span>
              <span>{items.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount ({discountPercent}%)</span>
                <span>-{formatCurrency(discount)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-bold text-base">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label>Payment Method</Label>
            <Select
              value={paymentMethod}
              onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="gcash">GCash</SelectItem>
                <SelectItem value="card">Credit/Debit Card</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="credit">Store Credit</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Amount Paid (cash only) */}
          {paymentMethod === "cash" && (
            <div className="space-y-2">
              <Label>Amount Tendered</Label>
              <Input
                type="number"
                min={total}
                step={0.01}
                placeholder={`Min: ${formatCurrency(total)}`}
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                className="text-lg font-semibold h-12"
              />
              {paid >= total && (
                <p className="text-sm text-green-600 font-medium">
                  Change: {formatCurrency(change)}
                </p>
              )}
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes for this order"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading || (paymentMethod === "cash" && paid < total)}
            className="min-w-32"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              `Confirm ${formatCurrency(total)}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
