"use client";

import { useState, useEffect, useCallback, useRef, type DragEvent } from "react";
import { useTenant } from "@/components/providers/TenantProvider";
import { getPurchaseOrderDiscountForOrgType } from "@/lib/purchaseOrders/orgTypeDiscountDefaults";
import { useSession } from "next-auth/react";
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
import { useFormatCurrency, useFormatDate } from "@/components/providers/TenantProvider";
import { PaymentTermsSchedulePanel } from "@/components/purchase-orders/PaymentTermsSchedulePanel";
import { Copy, GripVertical, Loader2, ListChecks, Plus, RefreshCw, Trash2 } from "lucide-react";
import {
  defaultPOItem,
  type Organization,
  type POItem,
  type ProductHit,
  type PurchaseOrderCatalogTemplate,
  type ProductVariantOption,
} from "@/components/purchase-orders/purchaseOrderFormTypes";
import { defaultProcurementUnitCost } from "@/lib/utils/procurementCost";
import { computePurchaseOrderTotals } from "@/lib/utils/purchaseOrderTotals";
import { cn } from "@/lib/utils";
import { reorderGalleryItems } from "@/lib/utils/gallery";

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
  /** On create, load all active catalog products into line items on mount. */
  applyCatalogTemplateOnMount?: boolean;
};

function catalogLineToPoItem(
  line: PurchaseOrderCatalogTemplate["items"][number],
  clientKey: string
): POItem {
  return {
    clientKey,
    productId: line.productId,
    productName: line.productName,
    baseProductName: line.baseProductName,
    sku: line.sku,
    variantId: line.variantId,
    variants: line.variants,
    quantity: line.quantity,
    unitCost: line.unitCost,
  };
}

export function PurchaseOrderForm({
  mode,
  poId,
  onSuccess,
  onCancel,
  showFooter = true,
  applyCatalogTemplateOnMount = false,
}: PurchaseOrderFormProps) {
  const money = useFormatCurrency();
  const formatDate = useFormatDate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: session } = useSession();
  const tenant = useTenant();
  const isEdit = mode === "edit" && !!poId;
  const isOrgAdmin = session?.user?.role === "ORG_ADMIN";
  const canSetDiscount = session?.user?.role === "ADMIN";
  const prevOrgIdRef = useRef<string | null>(null);
  const variantLoadSeqRef = useRef<Map<number, number>>(new Map());
  const lineKeyRef = useRef(1);
  const nextLineKey = useCallback(
    () => `po-line-${++lineKeyRef.current}`,
    []
  );
  const withLineKeys = useCallback(
    (items: POItem[]) =>
      items.map((item) => ({
        ...item,
        clientKey: item.clientKey ?? nextLineKey(),
      })),
    [nextLineKey]
  );
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const sessionOrgId = session?.user?.organizationId
    ? String(session.user.organizationId)
    : "";

  const [initialLoading, setInitialLoading] = useState(isEdit);
  const [editingPoNumber, setEditingPoNumber] = useState("");
  const [poTitle, setPoTitle] = useState("");
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [poNotes, setPONotes] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [discountPercent, setDiscountPercent] = useState(0);
  const [poCreatedAt, setPoCreatedAt] = useState<string | undefined>();
  const [poItems, setPOItems] = useState<POItem[]>(() => [
    { ...defaultPOItem, clientKey: "po-line-1" },
  ]);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [catalogApplied, setCatalogApplied] = useState(false);

  function paymentTermsPayload(): 3 | 6 | "weekly" | null {
    if (paymentTerms === "3") return 3;
    if (paymentTerms === "6") return 6;
    if (paymentTerms === "weekly") return "weekly";
    return null;
  }

  const {
    data: products = [],
    isError: isProductsError,
    error: productsError,
  } = useQuery<ProductHit[]>({
    queryKey: ["products-simple"],
    staleTime: 0,
    queryFn: async () => {
      const res = await fetch("/api/products?limit=100&isActive=true&includeVariantSummary=true");
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? `Failed to load products (${res.status})`);
      return (data.data ?? []) as ProductHit[];
    },
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
    try {
      const res = await fetch(`/api/purchase-orders/${poId}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? `Failed to load purchase order (${res.status})`);
      const po = json.data as {
        poNumber: string;
        title?: string;
        status: string;
        createdAt?: string;
        organizationId?: { _id: string } | string;
        expectedDeliveryDate?: string;
        paymentTermsMonths?: 3 | 6 | "weekly" | null;
        discountPercent?: number;
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
      setPoCreatedAt(po.createdAt);
      setPoTitle(po.title ?? "");
      const orgId =
        po.organizationId && typeof po.organizationId === "object"
          ? po.organizationId._id
          : po.organizationId;
      const orgIdStr = orgId ? String(orgId) : "";
      setSelectedOrgId(orgIdStr);
      prevOrgIdRef.current = orgIdStr;
      setExpectedDate(toDateInputValue(po.expectedDeliveryDate));
      const terms = po.paymentTermsMonths;
      setPaymentTerms(
        terms === 3 ? "3" : terms === 6 ? "6" : terms === "weekly" ? "weekly" : ""
      );
      setDiscountPercent(Number(po.discountPercent ?? 0));
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
            if (active.length > 0) {
              variants = active.map((v) => ({ ...v, _id: String(v._id) }));
            }
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
          quantity: Number(item.quantity) > 0 ? Number(item.quantity) : 1,
          unitCost: Number.isFinite(Number(item.unitCost)) ? Number(item.unitCost) : 0,
        });
      }
      setPOItems(
        withLineKeys(loadedItems.length > 0 ? loadedItems : [{ ...defaultPOItem }])
      );
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
  }, [poId, toast, onCancel, withLineKeys]);

  useEffect(() => {
    if (!isEdit) return;
    queueMicrotask(() => {
      void loadPurchaseOrder();
    });
  }, [isEdit, loadPurchaseOrder]);

  useEffect(() => {
    if (isEdit || !isOrgAdmin || !sessionOrgId) return;
    setSelectedOrgId(sessionOrgId);
  }, [isEdit, isOrgAdmin, sessionOrgId]);

  useEffect(() => {
    if (!selectedOrgId) return;
    const org = organizations.find((o) => o._id === selectedOrgId);
    if (!org) return;

    const orgChanged = prevOrgIdRef.current !== selectedOrgId;
    if (isEdit && !orgChanged) return;

    const pct = getPurchaseOrderDiscountForOrgType(
      org.type,
      tenant.purchaseOrderDiscountByOrgType
    );
    setDiscountPercent(pct);
    prevOrgIdRef.current = selectedOrgId;
  }, [selectedOrgId, organizations, tenant.purchaseOrderDiscountByOrgType, isEdit]);

  const orgOptions =
    isOrgAdmin && sessionOrgId
      ? organizations.filter((org) => org._id === sessionOrgId)
      : organizations;

  const applyCatalogTemplate = useCallback(
    async (opts?: { replace?: boolean; silent?: boolean }) => {
      setTemplateLoading(true);
      try {
        const res = await fetch("/api/purchase-orders/template");
        const json = await res.json();
        if (!json.success) {
          throw new Error(json.error ?? `Failed to load catalog template (${res.status})`);
        }
        const template = json.data as PurchaseOrderCatalogTemplate;
        if (template.lineCount === 0) {
          if (!opts?.silent) {
            toast({
              variant: "destructive",
              title: "No products in catalog",
              description: "Add active products before using the full catalog template.",
            });
          }
          return;
        }

        const existingCount = poItems.filter((i) => i.productId).length;
        if (
          existingCount > 0 &&
          opts?.replace !== false &&
          !window.confirm(
            `Replace ${existingCount} line item${existingCount === 1 ? "" : "s"} with ${template.lineCount} catalog products?`
          )
        ) {
          return;
        }

        setPOItems(
          withLineKeys(
            template.items.map((line) => catalogLineToPoItem(line, nextLineKey()))
          )
        );
        if (!poTitle.trim()) {
          setPoTitle(template.title);
        }
        setCatalogApplied(true);
        if (!opts?.silent) {
          toast({
            title: "Catalog template loaded",
            description: `${template.lineCount} products added. Adjust quantities before saving.`,
          });
        }
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Could not load catalog template",
          description: err instanceof Error ? err.message : "Unknown error",
        });
      } finally {
        setTemplateLoading(false);
      }
    },
    [poItems, poTitle, toast, nextLineKey, withLineKeys]
  );

  const catalogMountStarted = useRef(false);
  useEffect(() => {
    if (isEdit || !applyCatalogTemplateOnMount || catalogMountStarted.current) return;
    catalogMountStarted.current = true;
    queueMicrotask(() => {
      void applyCatalogTemplate({ replace: true, silent: false });
    });
  }, [isEdit, applyCatalogTemplateOnMount, applyCatalogTemplate]);

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
            organizationId: selectedOrgId,
            title: poTitle.trim() || undefined,
            items,
            paymentTermsMonths: paymentTermsPayload(),
            discountPercent,
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
          title: poTitle.trim() || undefined,
          items,
          paymentTermsMonths: paymentTermsPayload(),
          discountPercent,
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

  function nextVariantLoadSeq(index: number) {
    const next = (variantLoadSeqRef.current.get(index) ?? 0) + 1;
    variantLoadSeqRef.current.set(index, next);
    return next;
  }

  function isStaleVariantLoad(index: number, seq: number) {
    return variantLoadSeqRef.current.get(index) !== seq;
  }

  function selectPOProductById(index: number, productId: string) {
    void refreshPOProductLine(index, productId);
  }

  function refreshPOProductLine(
    index: number,
    productId: string,
    opts?: { preserveQuantity?: boolean }
  ) {
    void applyPOProductFromCatalog(index, String(productId), opts);
  }

  async function applyPOProductFromCatalog(
    index: number,
    productId: string,
    opts?: { preserveQuantity?: boolean }
  ) {
    const preserveQuantity = opts?.preserveQuantity ?? false;
    const seq = nextVariantLoadSeq(index);

    setPOItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              productId,
              variantsLoading: true,
            }
          : item
      )
    );

    try {
      const res = await fetch(`/api/products/${productId}`);
      const json = await res.json();
      if (isStaleVariantLoad(index, seq)) return;
      if (!json.success) {
        throw new Error(json.error ?? `Failed to load product (${res.status})`);
      }

      const product = json.data as {
        _id: string;
        name: string;
        sku: string;
        retailPrice: number;
        variants?: ProductVariantOption[];
      };

      const retailPrice = Number(product.retailPrice) || 0;
      const active = (product.variants ?? [])
        .filter((v) => v.isActive !== false)
        .map((v) => ({ ...v, _id: String(v._id) }));

      setPOItems((prev) =>
        prev.map((item, i) => {
          if (i !== index) return item;

          if (active.length === 0) {
            return {
              ...item,
              productId: String(product._id),
              productName: product.name,
              baseProductName: product.name,
              sku: product.sku,
              variantId: undefined,
              variants: [],
              variantsLoading: false,
              quantity:
                preserveQuantity && item.quantity > 0 ? item.quantity : 1,
              unitCost: defaultProcurementUnitCost(retailPrice),
            };
          }

          if (active.length === 1) {
            const variant = active[0]!;
            return {
              ...item,
              productId: String(product._id),
              baseProductName: product.name,
              variants: active,
              variantsLoading: false,
              variantId: variant._id,
              productName: `${product.name} — ${variant.name}`,
              sku: variant.sku,
              quantity:
                preserveQuantity && item.quantity > 0 ? item.quantity : 1,
              unitCost: defaultProcurementUnitCost(Number(variant.retailPrice) || 0),
            };
          }

          const keepVariant =
            item.variantId && active.some((v) => String(v._id) === String(item.variantId));
          const selected = keepVariant
            ? active.find((v) => String(v._id) === String(item.variantId))!
            : null;

          if (selected) {
            return {
              ...item,
              productId: String(product._id),
              baseProductName: product.name,
              variants: active,
              variantsLoading: false,
              variantId: String(selected._id),
              productName: `${product.name} — ${selected.name}`,
              sku: selected.sku,
              quantity: item.quantity > 0 ? item.quantity : 1,
              unitCost: defaultProcurementUnitCost(Number(selected.retailPrice) || 0),
            };
          }

          return {
            ...item,
            productId: String(product._id),
            productName: product.name,
            baseProductName: product.name,
            variants: active,
            variantsLoading: false,
            variantId: undefined,
            sku: "",
            quantity:
              preserveQuantity && item.quantity > 0 ? item.quantity : 1,
            unitCost: 0,
          };
        })
      );
    } catch (err) {
      if (isStaleVariantLoad(index, seq)) return;
      toast({
        variant: "destructive",
        title: "Could not load product pricing",
        description: err instanceof Error ? err.message : "Unknown error",
      });
      setPOItems((prev) =>
        prev.map((item, i) =>
          i === index ? { ...item, variantsLoading: false } : item
        )
      );
    }
  }

  function selectPOVariant(index: number, variantId: string) {
    const normalizedVariantId = String(variantId);
    setPOItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const variant = item.variants?.find((v) => String(v._id) === normalizedVariantId);
        if (!variant) return item;
        const baseName = item.baseProductName ?? item.productName;
        return {
          ...item,
          variantId: String(variant._id),
          productName: `${baseName} — ${variant.name}`,
          sku: variant.sku,
          unitCost: defaultProcurementUnitCost(Number(variant.retailPrice) || 0),
        };
      })
    );
  }

  function updateItem(index: number, field: keyof POItem, value: string | number) {
    setPOItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  function addItem() {
    setPOItems((prev) => [...prev, { ...defaultPOItem, clientKey: nextLineKey() }]);
  }

  function removeItem(index: number) {
    setPOItems((prev) => prev.filter((_, i) => i !== index));
  }

  function duplicateItem(index: number) {
    setPOItems((prev) => {
      const source = prev[index];
      if (!source) return prev;
      const copy: POItem = {
        ...source,
        clientKey: nextLineKey(),
        variants: source.variants ? [...source.variants] : source.variants,
      };
      const next = [...prev];
      next.splice(index + 1, 0, copy);
      return next;
    });
  }

  function reorderItems(fromIndex: number, toIndex: number) {
    setPOItems((prev) => reorderGalleryItems(prev, fromIndex, toIndex));
  }

  function handleItemDragStart(index: number) {
    setDragIndex(index);
  }

  function handleItemDragOver(e: DragEvent, index: number) {
    e.preventDefault();
    setDropIndex(index);
  }

  function handleItemDrop(e: DragEvent, index: number) {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) {
      setDragIndex(null);
      setDropIndex(null);
      return;
    }
    reorderItems(dragIndex, index);
    setDragIndex(null);
    setDropIndex(null);
  }

  function handleItemDragEnd() {
    setDragIndex(null);
    setDropIndex(null);
  }

  const lineSubtotal = poItems.reduce((sum, i) => sum + i.quantity * i.unitCost, 0);
  const pricing = computePurchaseOrderTotals(lineSubtotal, discountPercent);

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
      {isProductsError && (
        <Alert variant="destructive">
          <AlertDescription>
            {productsError instanceof Error
              ? productsError.message
              : "Unable to load product list for line items."}
          </AlertDescription>
        </Alert>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="po-title">Title</Label>
          <Input
            id="po-title"
            value={poTitle}
            onChange={(e) => setPoTitle(e.target.value)}
            placeholder="e.g. Q2 restock — Manila branch"
            maxLength={200}
          />
        </div>
        <div className="space-y-1">
          <Label>Organization</Label>
          <Select
            value={selectedOrgId}
            onValueChange={setSelectedOrgId}
            disabled={isOrgAdmin && !!sessionOrgId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select organization" />
            </SelectTrigger>
            <SelectContent>
              {orgOptions.map((org) => (
                <SelectItem key={org._id} value={org._id}>
                  {org.name}
                  <span className="text-muted-foreground capitalize ml-1">({org.type})</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isOrgAdmin && sessionOrgId ? (
            <p className="text-xs text-muted-foreground">Orders are created for your organization.</p>
          ) : null}
        </div>
        <div className="space-y-1">
          <Label>Expected Delivery</Label>
          <Input
            type="date"
            value={expectedDate}
            onChange={(e) => setExpectedDate(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label>Payment terms</Label>
          <Select
            value={paymentTerms || "none"}
            onValueChange={(v) => setPaymentTerms(v === "none" ? "" : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select payment terms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="weekly">Weekly (due in 7 days)</SelectItem>
              <SelectItem value="3">3 months</SelectItem>
              <SelectItem value="6">6 months</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="po-discount">Discount (%)</Label>
          <Input
            id="po-discount"
            type="number"
            min={0}
            max={100}
            step={0.01}
            value={discountPercent}
            readOnly={!canSetDiscount}
            disabled={!canSetDiscount}
            onChange={(e) => {
              if (!canSetDiscount) return;
              const n = parseFloat(e.target.value);
              setDiscountPercent(Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0);
            }}
            placeholder="e.g. 20"
          />
          <p className="text-xs text-muted-foreground">
            {canSetDiscount
              ? "Applied to line subtotal. Defaults from organization type; you may override."
              : "Set by organization type (configured by administrator)."}
          </p>
        </div>
        <PaymentTermsSchedulePanel
          total={pricing.total}
          paymentTermsMonths={paymentTermsPayload()}
          termsStartDate={poCreatedAt ?? (expectedDate || undefined)}
          formatMoney={money}
          formatDate={formatDate}
        />
      </div>

      <div className="space-y-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Label>Items</Label>
          <div className="flex flex-wrap gap-2">
            {!isEdit && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={templateLoading}
                onClick={() => void applyCatalogTemplate({ replace: true })}
              >
                {templateLoading ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <ListChecks className="h-3 w-3 mr-1" />
                )}
                {catalogApplied ? "Reload full catalog" : "Load full catalog"}
              </Button>
            )}
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              <Plus className="h-3 w-3 mr-1" />
              Add Item
            </Button>
          </div>
        </div>
        {!isEdit && catalogApplied && (
          <p className="text-xs text-muted-foreground">
            Full catalog template applied — set quantities per line, then save as draft.
          </p>
        )}
        {poItems.length > 1 && (
          <p className="text-xs text-muted-foreground">Drag rows to reorder line items.</p>
        )}
        <div className="border rounded-lg divide-y">
          {poItems.map((item, index) => (
            <div
              key={item.clientKey ?? index}
              onDragOver={(e) => handleItemDragOver(e, index)}
              onDrop={(e) => handleItemDrop(e, index)}
              className={cn(
                "p-3 space-y-2",
                dragIndex === index && "opacity-50",
                dropIndex === index &&
                  dragIndex !== null &&
                  dragIndex !== index &&
                  "ring-2 ring-primary ring-inset bg-muted/30"
              )}
            >
              <div className="flex gap-2">
                {poItems.length > 1 && (
                  <button
                    type="button"
                    draggable
                    className="mt-5 flex h-8 w-6 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground hover:bg-muted active:cursor-grabbing"
                    title="Drag to reorder"
                    aria-label={`Reorder line ${index + 1}`}
                    onDragStart={(e) => {
                      e.stopPropagation();
                      handleItemDragStart(index);
                    }}
                    onDragEnd={handleItemDragEnd}
                  >
                    <GripVertical className="h-4 w-4" />
                  </button>
                )}
                <div className="min-w-0 flex-1 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Product *</Label>
                  <Select
                    value={item.productId || undefined}
                    onValueChange={(v) => selectPOProductById(index, v)}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p._id} value={p._id}>
                          {p.name} ({p.sku})
                          {typeof p.variantCount === "number" && p.variantCount > 0
                            ? ` · ${p.variantCount} variant${p.variantCount === 1 ? "" : "s"}`
                            : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <div>
                    <div className="flex items-center justify-between gap-1">
                      <Label className="text-xs">Unit cost</Label>
                      {item.productId && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          title="Refresh unit cost from catalog (40% of retail)"
                          aria-label="Refresh unit cost from catalog"
                          disabled={item.variantsLoading}
                          onClick={() =>
                            refreshPOProductLine(index, item.productId, {
                              preserveQuantity: true,
                            })
                          }
                        >
                          {item.variantsLoading ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3 w-3" />
                          )}
                        </Button>
                      )}
                    </div>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      className="h-8 text-sm"
                      value={Number.isFinite(item.unitCost) ? item.unitCost : 0}
                      onChange={(e) =>
                        updateItem(index, "unitCost", parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Qty</Label>
                    <Input
                      type="number"
                      min={1}
                      className="h-8 text-sm"
                      value={Number.isFinite(item.quantity) ? item.quantity : 1}
                      onChange={(e) =>
                        updateItem(index, "quantity", parseInt(e.target.value, 10) || 1)
                      }
                    />
                  </div>
                </div>
                </div>
              </div>
              {item.variantsLoading && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Loading variants…
                </div>
              )}
              {item.variants && item.variants.length > 1 && (
                <div className="space-y-1">
                  <Label className="text-xs">Variant *</Label>
                  {!item.variantId && (
                    <p className="text-[11px] text-amber-700">
                      Select a variant to apply unit cost and SKU.
                    </p>
                  )}
                  <Select
                    value={item.variantId ?? ""}
                    onValueChange={(vId) => selectPOVariant(index, vId)}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Select variant" />
                    </SelectTrigger>
                    <SelectContent>
                      {item.variants.map((v) => (
                        <SelectItem key={String(v._id)} value={String(v._id)}>
                          {v.name} ({v.sku})
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
                <div className="flex items-center gap-0.5">
                  {item.productId && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      title="Duplicate line"
                      aria-label="Duplicate line"
                      onClick={() => duplicateItem(index)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  )}
                  {poItems.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive"
                      title="Remove line"
                      aria-label="Remove line"
                      onClick={() => removeItem(index)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-col items-end gap-1 text-sm">
          <div className="flex justify-between gap-8 w-full max-w-xs">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{money(pricing.subtotal)}</span>
          </div>
          {pricing.discountAmount > 0 ? (
            <div className="flex justify-between gap-8 w-full max-w-xs text-green-600">
              <span>Discount ({pricing.discountPercent}%)</span>
              <span>−{money(pricing.discountAmount)}</span>
            </div>
          ) : null}
          <div className="flex justify-between gap-8 w-full max-w-xs font-semibold border-t pt-1">
            <span>Total</span>
            <span>{money(pricing.total)}</span>
          </div>
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
          !selectedOrgId ||
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

  const formShellClass = cn(
    "touch-pan-y overscroll-y-contain [-webkit-overflow-scrolling:touch]",
    "max-h-[calc(100dvh-10rem)] overflow-y-auto lg:max-h-none lg:overflow-visible"
  );

  if (!showFooter) {
    return <div className={formShellClass}>{formBody}</div>;
  }

  return (
    <div className={formShellClass}>
      <div className="space-y-6 pb-2">
        {formBody}
        {footer}
      </div>
    </div>
  );
}
