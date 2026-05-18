"use client";

import { useState, useEffect, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useFormatCurrency } from "@/components/providers/TenantProvider";
import { Loader2, Plus, Trash2 } from "lucide-react";
import {
  defaultPOItem,
  type Organization,
  type POItem,
  type ProductHit,
  type ProductVariantOption,
} from "@/components/purchase-orders/purchaseOrderFormTypes";
import { defaultProcurementUnitCost } from "@/lib/utils/procurementCost";

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

function toDateInputValue(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export type PurchaseOrderFormProps = {
  mode: "create" | "edit";
  poId?: string;
  onSuccess: (result?: { id: string; poNumber?: string }) => void;
  onCancel: () => void;
  /** Hide action footer (e.g. when parent supplies dialog footer). */
  showFooter?: boolean;
};

export function PurchaseOrderForm({
  mode,
  poId,
  onSuccess,
  onCancel,
  showFooter = true,
}: PurchaseOrderFormProps) {
  const money = useFormatCurrency();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isEdit = mode === "edit" && !!poId;

  const [initialLoading, setInitialLoading] = useState(isEdit);
  const [editingPoNumber, setEditingPoNumber] = useState("");
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [poNotes, setPONotes] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [poItems, setPOItems] = useState<POItem[]>([{ ...defaultPOItem }]);
  const [poSuggestRow, setPoSuggestRow] = useState<number | null>(null);

  const poSuggestQuery =
    poSuggestRow !== null ? (poItems[poSuggestRow]?.productName ?? "").trim() : "";
  const debouncedPOSuggestQuery = useDebouncedValue(poSuggestQuery, 280);

  const {
    data: poProductHits = [],
    isFetching: poProductsLoading,
    isError: isProductSearchError,
    error: productSearchError,
  } = useQuery({
    queryKey: ["purchase-order-product-search", debouncedPOSuggestQuery],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: "1",
        limit: "30",
        search: debouncedPOSuggestQuery,
        isActive: "true",
        includeVariantSummary: "true",
      });
      const res = await fetch(`/api/products?${params}`);
      const j = await res.json();
      if (!j.success) throw new Error(j.error ?? `Product search failed (${res.status})`);
      const raw = j.data;
      return Array.isArray(raw) ? (raw as ProductHit[]) : [];
    },
    enabled: debouncedPOSuggestQuery.length >= 2,
  });

  const {
    data: organizations = [],
    isError: isOrgsError,
    error: orgsError,
  } = useQuery({
    queryKey: ["organizations-for-purchase-orders"],
    queryFn: async () => {
      const res = await fetch("/api/organizations/for-purchase-orders");
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? `Failed to load organizations (${res.status})`);
      return (json.data ?? []) as Organization[];
    },
  });

  const loadPurchaseOrder = useCallback(async () => {
    if (!poId) return;
    setInitialLoading(true);
    setPoSuggestRow(null);
    try {
      const res = await fetch(`/api/purchase-orders/${poId}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? `Failed to load purchase order (${res.status})`);
      const po = json.data as {
        poNumber: string;
        status: string;
        organizationId?: { _id: string } | string;
        expectedDeliveryDate?: string;
        notes?: string;
        items: {
          productId?: { _id: string } | string;
          variantId?: { _id: string } | string | null;
          productName: string;
          sku: string;
          quantity: number;
          unitCost: number;
        }[];
      };

      if (po.status !== "draft") {
        throw new Error("Only draft purchase orders can be edited");
      }

      setEditingPoNumber(po.poNumber);
      const orgId =
        po.organizationId && typeof po.organizationId === "object"
          ? po.organizationId._id
          : po.organizationId;
      setSelectedOrgId(orgId ? String(orgId) : "");
      setExpectedDate(toDateInputValue(po.expectedDeliveryDate));
      setPONotes(po.notes ?? "");

      const loadedItems: POItem[] = [];
      for (const item of po.items ?? []) {
        const productId = String(
          item.productId && typeof item.productId === "object"
            ? item.productId._id
            : item.productId ?? ""
        );
        let variants: ProductVariantOption[] | undefined;
        if (productId) {
          const vRes = await fetch(`/api/products/${productId}/variants`);
          const vJson = await vRes.json();
          if (vJson.success) {
            const active = ((vJson.data ?? []) as ProductVariantOption[]).filter(
              (v) => v.isActive !== false
            );
            if (active.length > 0) variants = active;
          }
        }
        const variantIdRaw = item.variantId;
        const variantId =
          variantIdRaw && typeof variantIdRaw === "object"
            ? String(variantIdRaw._id)
            : variantIdRaw
              ? String(variantIdRaw)
              : undefined;
        const productName = item.productName ?? "";
        const sep = " — ";
        const baseProductName = productName.includes(sep)
          ? productName.split(sep)[0]!
          : productName;
        loadedItems.push({
          productId,
          productName,
          baseProductName,
          sku: item.sku,
          variantId,
          variants,
          quantity: item.quantity,
          unitCost: item.unitCost,
        });
      }
      setPOItems(loadedItems.length > 0 ? loadedItems : [{ ...defaultPOItem }]);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Could not load purchase order",
        description: err instanceof Error ? err.message : "Unknown error",
      });
      onCancel();
    } finally {
      setInitialLoading(false);
    }
  }, [poId, toast, onCancel]);

  useEffect(() => {
    if (isEdit) {
      void loadPurchaseOrder();
    }
  }, [isEdit, loadPurchaseOrder]);

  function buildItemsPayload() {
    return poItems
      .filter((i) => i.productId && (!i.variants?.length || i.variantId))
      .map(({ productId, variantId, productName, sku, quantity, unitCost }) => ({
        productId,
        variantId: variantId || undefined,
        productName,
        sku,
        quantity,
        unitCost,
      }));
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const items = buildItemsPayload();
      if (isEdit && poId) {
        const res = await fetch(`/api/purchase-orders/${poId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items,
            expectedDeliveryDate: expectedDate || undefined,
            notes: poNotes || undefined,
          }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error ?? `Update failed (${res.status})`);
        return data.data as { _id: string; poNumber?: string };
      }
      const res = await fetch("/api/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: selectedOrgId,
          items,
          expectedDeliveryDate: expectedDate || undefined,
          notes: poNotes || undefined,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? `Create failed (${res.status})`);
      return data.data as { _id: string; poNumber?: string };
    },
    onSuccess: (po) => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      if (po?._id) {
        queryClient.invalidateQueries({ queryKey: ["purchase-order", po._id] });
      }
      onSuccess(
        po?._id
          ? { id: String(po._id), poNumber: po.poNumber }
          : undefined
      );
    },
    onError: (err: Error) =>
      toast({
        variant: "destructive",
        title: isEdit ? "Could not update PO" : "Could not create PO",
        description: err.message,
      }),
  });

  const poItemsReady = poItems.every((i) => {
    if (!i.productId) return true;
    if (i.variantsLoading) return false;
    if (i.variants && i.variants.length > 0) return !!i.variantId;
    return true;
  });

  function patchPOItem(index: number, patch: Partial<POItem>) {
    setPOItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item))
    );
  }

  async function selectPOProduct(index: number, p: ProductHit) {
    patchPOItem(index, {
      productId: p._id,
      productName: p.name,
      baseProductName: p.name,
      sku: p.sku,
      unitCost: defaultProcurementUnitCost(p.retailPrice),
      variantId: undefined,
      variants: undefined,
      variantsLoading: true,
    });
    setPoSuggestRow(null);

    try {
      const res = await fetch(`/api/products/${p._id}/variants`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to load variants");
      const all = (json.data ?? []) as ProductVariantOption[];
      const active = all.filter((v) => v.isActive !== false);

      if (active.length > 0) {
        patchPOItem(index, {
          variants: active,
          variantsLoading: false,
          variantId: undefined,
          sku: "",
          unitCost: 0,
        });
      } else {
        patchPOItem(index, {
          variants: [],
          variantsLoading: false,
        });
      }
    } catch {
      patchPOItem(index, { variants: [], variantsLoading: false });
    }
  }

  function selectPOVariant(index: number, variantId: string) {
    const item = poItems[index];
    const variant = item?.variants?.find((v) => v._id === variantId);
    if (!item || !variant) return;
    const baseName = item.baseProductName ?? item.productName;
    patchPOItem(index, {
      variantId: variant._id,
      productName: `${baseName} — ${variant.name}`,
      sku: variant.sku,
      unitCost: defaultProcurementUnitCost(variant.retailPrice),
    });
  }

  function updateItem(index: number, field: keyof POItem, value: string | number) {
    setPOItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  function addItem() {
    setPOItems((prev) => [...prev, { ...defaultPOItem }]);
  }

  function removeItem(index: number) {
    setPOItems((prev) => prev.filter((_, i) => i !== index));
  }

  const itemsTotal = poItems.reduce((sum, i) => sum + i.quantity * i.unitCost, 0);

  if (initialLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const formBody = (
    <div className="space-y-4">
      {isOrgsError && (
        <Alert variant="destructive">
          <AlertDescription>
            {orgsError instanceof Error ? orgsError.message : "Unable to load organizations."}
          </AlertDescription>
        </Alert>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>Organization</Label>
          <Select
            value={selectedOrgId}
            onValueChange={setSelectedOrgId}
            disabled={isEdit}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select organization" />
            </SelectTrigger>
            <SelectContent>
              {organizations.map((org) => (
                <SelectItem key={org._id} value={org._id}>
                  {org.name}
                  <span className="text-muted-foreground capitalize ml-1">({org.type})</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Expected Delivery</Label>
          <Input
            type="date"
            value={expectedDate}
            onChange={(e) => setExpectedDate(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Items</Label>
          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            <Plus className="h-3 w-3 mr-1" />
            Add Item
          </Button>
        </div>
        <div className="border rounded-lg divide-y">
          {poItems.map((item, index) => (
            <div key={index} className="p-3 space-y-2">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="relative">
                  <Label className="text-xs">Product</Label>
                  <Input
                    className="h-8 text-sm"
                    placeholder="Type to search catalog…"
                    value={item.productName}
                    autoComplete="off"
                    onFocus={() => setPoSuggestRow(index)}
                    onChange={(e) => {
                      updateItem(index, "productName", e.target.value);
                      setPoSuggestRow(index);
                      if (e.target.value.trim() === "") {
                        patchPOItem(index, {
                          productId: "",
                          variantId: undefined,
                          variants: undefined,
                          variantsLoading: false,
                          sku: "",
                          unitCost: 0,
                        });
                      }
                    }}
                    onBlur={() => {
                      window.setTimeout(() => {
                        setPoSuggestRow((cur) => (cur === index ? null : cur));
                      }, 180);
                    }}
                  />
                  {poSuggestRow === index && poSuggestQuery.length >= 2 && (
                    <div
                      className="absolute left-0 right-0 top-full z-50 mt-1 max-h-52 overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md"
                      role="listbox"
                    >
                      {poProductsLoading ? (
                        <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Searching…
                        </div>
                      ) : isProductSearchError ? (
                        <p className="px-3 py-3 text-sm text-destructive">
                          {productSearchError instanceof Error
                            ? productSearchError.message
                            : "Product search failed."}
                        </p>
                      ) : poProductHits.length === 0 ? (
                        <p className="px-3 py-3 text-sm text-muted-foreground">No matching products.</p>
                      ) : (
                        poProductHits.map((p) => (
                          <button
                            key={p._id}
                            type="button"
                            role="option"
                            aria-selected={item.productId === p._id}
                            className="flex w-full flex-col items-start gap-0.5 border-b px-3 py-2 text-left text-sm last:border-0 hover:bg-muted"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => selectPOProduct(index, p)}
                          >
                            <span className="font-medium">{p.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {p.sku} · {money(p.retailPrice)}
                              {typeof p.variantCount === "number" && p.variantCount > 0 && (
                                <> · {p.variantCount} variant{p.variantCount === 1 ? "" : "s"}</>
                              )}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <div>
                    <Label className="text-xs">Qty</Label>
                    <Input
                      type="number"
                      min={1}
                      className="h-8 text-sm"
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(index, "quantity", parseInt(e.target.value, 10) || 1)
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Unit cost</Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      className="h-8 text-sm"
                      value={item.unitCost}
                      onChange={(e) =>
                        updateItem(index, "unitCost", parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>
                </div>
              </div>
              {item.variantsLoading && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Loading variants…
                </div>
              )}
              {item.variants && item.variants.length > 0 && (
                <div className="space-y-1">
                  <Label className="text-xs">Variant *</Label>
                  <Select
                    value={item.variantId ?? ""}
                    onValueChange={(vId) => selectPOVariant(index, vId)}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Select variant" />
                    </SelectTrigger>
                    <SelectContent>
                      {item.variants.map((v) => (
                        <SelectItem key={v._id} value={v._id}>
                          {v.name} ({v.sku}) · {money(v.retailPrice)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">
                  Subtotal: {money(item.quantity * item.unitCost)}
                </span>
                {poItems.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive"
                    onClick={() => removeItem(index)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end text-sm font-semibold">
          Total: {money(itemsTotal)}
        </div>
      </div>

      <div className="space-y-1">
        <Label>Notes</Label>
        <textarea
          className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
          value={poNotes}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPONotes(e.target.value)}
          placeholder="Optional notes..."
          rows={2}
        />
      </div>

      {isEdit && editingPoNumber ? (
        <p className="text-xs text-muted-foreground">Editing draft {editingPoNumber}</p>
      ) : null}
    </div>
  );

  const footer = (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <Button
        type="button"
        variant="outline"
        onClick={onCancel}
        disabled={saveMutation.isPending}
      >
        Cancel
      </Button>
      <Button
        type="button"
        onClick={() => saveMutation.mutate()}
        disabled={
          saveMutation.isPending ||
          (!isEdit && !selectedOrgId) ||
          poItems.every((i) => !i.productId) ||
          !poItemsReady
        }
      >
        {saveMutation.isPending
          ? isEdit
            ? "Saving..."
            : "Creating..."
          : isEdit
            ? "Save Changes"
            : "Create Purchase Order"}
      </Button>
    </div>
  );

  if (!showFooter) {
    return formBody;
  }

  return (
    <div className="space-y-6">
      {formBody}
      {footer}
    </div>
  );
}
