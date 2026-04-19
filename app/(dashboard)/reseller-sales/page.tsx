"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Plus, Loader2, X, CheckCircle, ShoppingBag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";

type OrganizationType = "distributor" | "franchise" | "partner" | "headquarters";
type PaymentMethod = "cash" | "gcash" | "card" | "bank_transfer" | "credit";

interface Organization {
  _id: string;
  name: string;
  type: OrganizationType;
  settings?: { hasInventory: boolean };
}

interface OrgInventoryItem {
  _id: string;
  productId: { _id: string; name: string; sku: string; retailPrice: number; distributorPrice: number };
  quantity: number;
}

interface SaleItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  maxStock: number;
}

interface SaleResult {
  orderNumber: string;
  total: number;
  change: number;
  paymentMethod: string;
}

interface ResellerOrder {
  _id: string;
  orderNumber: string;
  type: string;
  status: string;
  total: number;
  cashierId?: { name: string };
  createdAt: string;
}

const defaultSaleItem: SaleItem = {
  productId: "",
  productName: "",
  sku: "",
  quantity: 1,
  unitPrice: 0,
  maxStock: 0,
};

export default function ResellerSalesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [saleOpen, setSaleOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [amountPaid, setAmountPaid] = useState("");
  const [notes, setNotes] = useState("");
  const [saleItems, setSaleItems] = useState<SaleItem[]>([{ ...defaultSaleItem }]);
  const [formError, setFormError] = useState("");
  const [saleResult, setSaleResult] = useState<SaleResult | null>(null);

  const { data: organizations = [] } = useQuery<Organization[]>({
    queryKey: ["organizations"],
    queryFn: async () => {
      const res = await fetch("/api/organizations");
      const data = await res.json();
      return data.data ?? [];
    },
  });

  const { data: orgInventory = [] } = useQuery<OrgInventoryItem[]>({
    queryKey: ["org-inventory-sale", selectedOrg],
    queryFn: async () => {
      const res = await fetch(`/api/organization-inventory?organizationId=${selectedOrg}`);
      const data = await res.json();
      return data.data ?? [];
    },
    enabled: !!selectedOrg,
  });

  const { data: resellerOrdersData, isLoading } = useQuery({
    queryKey: ["reseller-orders"],
    queryFn: async () => {
      const res = await fetch("/api/orders?type=DISTRIBUTOR&limit=50");
      const data = await res.json();
      return (data.data ?? []) as ResellerOrder[];
    },
  });

  const saleMutation = useMutation({
    mutationFn: async () => {
      const total = saleItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
      const paid = paymentMethod === "cash" ? parseFloat(amountPaid) || 0 : total;
      const res = await fetch("/api/reseller-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: selectedOrg,
          items: saleItems.filter((i) => i.productId).map((i) => ({
            productId: i.productId,
            productName: i.productName,
            sku: i.sku,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          })),
          paymentMethod,
          amountPaid: paid,
          notes: notes || undefined,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data as SaleResult;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["reseller-orders"] });
      queryClient.invalidateQueries({ queryKey: ["org-inventory", selectedOrg] });
      queryClient.invalidateQueries({ queryKey: ["org-inventory-sale", selectedOrg] });
      setSaleResult(result);
    },
    onError: (err: Error) => setFormError(err.message),
  });

  function resetForm() {
    setSelectedOrg("");
    setPaymentMethod("cash");
    setAmountPaid("");
    setNotes("");
    setSaleItems([{ ...defaultSaleItem }]);
    setFormError("");
    setSaleResult(null);
  }

  function selectProduct(idx: number, productId: string) {
    const inv = orgInventory.find((i) => i.productId._id === productId);
    if (!inv) return;
    setSaleItems((prev) =>
      prev.map((item, i) =>
        i === idx
          ? {
              ...item,
              productId: inv.productId._id,
              productName: inv.productId.name,
              sku: inv.productId.sku,
              unitPrice: inv.productId.distributorPrice || inv.productId.retailPrice,
              maxStock: inv.quantity,
            }
          : item
      )
    );
  }

  function updateItem(idx: number, field: keyof SaleItem, value: string | number) {
    setSaleItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    );
  }

  const total = saleItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const paid = parseFloat(amountPaid) || 0;
  const change = Math.max(0, paid - total);
  const canSubmit =
    !!selectedOrg &&
    saleItems.some((i) => i.productId) &&
    (paymentMethod !== "cash" || paid >= total);

  const resellerOrders = resellerOrdersData ?? [];

  const columns = [
    {
      key: "orderNumber",
      label: "Order #",
      render: (o: ResellerOrder) => (
        <span className="font-mono text-sm font-medium">{o.orderNumber}</span>
      ),
    },
    {
      key: "type",
      label: "Type",
      render: (o: ResellerOrder) => (
        <Badge variant="secondary" className="capitalize">{o.type}</Badge>
      ),
    },
    {
      key: "total",
      label: "Total",
      render: (o: ResellerOrder) => (
        <span className="font-semibold">{formatCurrency(o.total)}</span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (o: ResellerOrder) => (
        <Badge variant="success">{o.status}</Badge>
      ),
    },
    {
      key: "by",
      label: "Recorded By",
      render: (o: ResellerOrder) => (
        <span className="text-sm text-muted-foreground">{o.cashierId?.name ?? "—"}</span>
      ),
    },
    {
      key: "date",
      label: "Date",
      render: (o: ResellerOrder) => (
        <span className="text-xs text-muted-foreground">
          {new Date(o.createdAt).toLocaleDateString("en-PH")}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col">
      <Header
        title="Reseller Sales"
        subtitle="Record community sales by distributors, franchises, and partners"
      />
      <div className="flex-1 p-6 space-y-4">
        <div className="flex justify-end">
          <Button onClick={() => { resetForm(); setSaleOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Record Sale
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">
          {resellerOrders.length} sale{resellerOrders.length !== 1 ? "s" : ""} recorded
        </p>

        <DataTable
          columns={columns}
          data={resellerOrders}
          loading={isLoading}
          keyExtractor={(o) => o._id}
          emptyMessage="No reseller sales yet."
        />
      </div>

      {/* Sale Dialog */}
      <Dialog open={saleOpen} onOpenChange={(v) => { if (!v) resetForm(); setSaleOpen(v); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {saleResult ? (
            <div className="py-6 space-y-4 text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
              <div>
                <h2 className="text-2xl font-bold">Sale Recorded!</h2>
                <p className="text-muted-foreground text-sm mt-1">{saleResult.orderNumber}</p>
              </div>
              <div className="bg-muted rounded-lg p-4 text-left space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Total</span>
                  <span className="font-semibold">{formatCurrency(saleResult.total)}</span>
                </div>
                {saleResult.paymentMethod === "cash" && saleResult.change > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Change</span>
                    <span className="font-semibold">{formatCurrency(saleResult.change)}</span>
                  </div>
                )}
              </div>
              <Button onClick={() => { resetForm(); setSaleOpen(false); }}>Done</Button>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5" />
                  Record Reseller Sale
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {formError && (
                  <Alert variant="destructive">
                    <AlertDescription>{formError}</AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label>Organization</Label>
                    <Select
                      value={selectedOrg}
                      onValueChange={(v) => { setSelectedOrg(v); setSaleItems([{ ...defaultSaleItem }]); }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select organization" />
                      </SelectTrigger>
                      <SelectContent>
                        {organizations.filter((o) => o.settings?.hasInventory).map((org) => (
                          <SelectItem key={org._id} value={org._id}>
                            {org.name}
                            <span className="text-muted-foreground capitalize ml-1">({org.type})</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Items</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSaleItems((p) => [...p, { ...defaultSaleItem }])}
                      disabled={!selectedOrg}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Item
                    </Button>
                  </div>

                  {!selectedOrg && (
                    <p className="text-xs text-muted-foreground">Select an organization to see available stock.</p>
                  )}

                  <div className="space-y-2">
                    {saleItems.map((item, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-start p-3 border rounded-lg">
                        <div className="col-span-12 sm:col-span-5 space-y-1">
                          <Label className="text-xs text-muted-foreground">Product</Label>
                          <Select
                            value={item.productId}
                            onValueChange={(v) => selectProduct(idx, v)}
                            disabled={!selectedOrg || orgInventory.length === 0}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue placeholder="Select product" />
                            </SelectTrigger>
                            <SelectContent>
                              {orgInventory.map((inv) => (
                                <SelectItem
                                  key={inv.productId._id}
                                  value={inv.productId._id}
                                  disabled={inv.quantity === 0}
                                >
                                  {inv.productId.name} ({inv.productId.sku}) — {inv.quantity} in stock
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-3 sm:col-span-2 space-y-1">
                          <Label className="text-xs text-muted-foreground">Qty</Label>
                          <Input
                            type="number"
                            min={1}
                            max={item.maxStock || undefined}
                            value={item.quantity}
                            onChange={(e) => updateItem(idx, "quantity", Math.min(parseInt(e.target.value) || 1, item.maxStock || 9999))}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="col-span-4 sm:col-span-4 space-y-1">
                          <Label className="text-xs text-muted-foreground">Unit Price</Label>
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            value={item.unitPrice}
                            onChange={(e) => updateItem(idx, "unitPrice", parseFloat(e.target.value) || 0)}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="col-span-1 flex items-end pb-0.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => setSaleItems((p) => p.filter((_, i) => i !== idx))}
                            disabled={saleItems.length === 1}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        {item.productId && (
                          <div className="col-span-12 text-right text-xs text-muted-foreground">
                            Line total: {formatCurrency(item.quantity * item.unitPrice)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="text-right text-sm font-medium">
                    Total: {formatCurrency(total)}
                  </div>
                </div>

                {/* Payment */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Payment Method</Label>
                    <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="gcash">GCash</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="credit">Store Credit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
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
                      />
                      {paid >= total && total > 0 && (
                        <p className="text-xs text-green-600 font-medium">
                          Change: {formatCurrency(change)}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-1">
                  <Label>Notes (optional)</Label>
                  <Input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional notes"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => { resetForm(); setSaleOpen(false); }}>
                  Cancel
                </Button>
                <Button
                  onClick={() => { setFormError(""); saleMutation.mutate(); }}
                  disabled={saleMutation.isPending || !canSubmit}
                >
                  {saleMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Confirm Sale
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
