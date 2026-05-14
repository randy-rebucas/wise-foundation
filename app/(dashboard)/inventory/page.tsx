"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { Header } from "@/components/layout/Header";
import { StockTable } from "@/components/inventory/StockTable";
import { MovementLog } from "@/components/inventory/MovementLog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatCard } from "@/components/shared/StatCard";
import { Boxes, AlertTriangle, TrendingDown, ArrowDownUp, Loader2, Building2, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { useFormatCurrency } from "@/components/providers/TenantProvider";

interface OrgInventoryItem {
  _id: string;
  organizationId: { _id: string; name: string; type: string };
  productId: { _id: string; name: string; sku: string; retailPrice: number };
  quantity: number;
  totalReceived: number;
  totalSold: number;
}


interface MovementForm {
  productId: string;
  type: "IN" | "OUT" | "TRANSFER" | "ADJUSTMENT";
  quantity: number;
  unitCost: number;
  toBranchId: string;
  reference: string;
  notes: string;
}

interface OrgTransferForm {
  fromOrganizationId: string;
  toOrganizationId: string;
  productId: string;
  quantity: number;
  reference: string;
  notes: string;
}

const defaultMovementForm: MovementForm = {
  productId: "",
  type: "IN",
  quantity: 1,
  unitCost: 0,
  toBranchId: "",
  reference: "",
  notes: "",
};

const defaultOrgTransferForm: OrgTransferForm = {
  fromOrganizationId: "",
  toOrganizationId: "",
  productId: "",
  quantity: 1,
  reference: "",
  notes: "",
};

interface Product {
  _id: string;
  name: string;
  sku: string;
}

interface Branch {
  _id: string;
  name: string;
  code: string;
}

interface InventoryItem {
  _id: string;
  quantity: number;
  lowStockThreshold: number;
  productId: {
    _id: string;
    name: string;
    sku: string;
    category: string;
    retailPrice: number;
  };
  variantId?: { name: string; sku: string };
}

interface StockMovement {
  _id: string;
  type: "IN" | "OUT" | "TRANSFER" | "ADJUSTMENT";
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  productId: { name: string; sku: string };
  performedBy: { name: string };
  fromBranchId?: { name: string; code: string };
  toBranchId?: { name: string; code: string };
  reference?: string;
  notes?: string;
  createdAt: string;
}

export default function InventoryPage() {
  const money = useFormatCurrency();
  const { data: session } = useSession();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const defaultBranchId = session?.user?.branchIds?.[0] ?? "";
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const needsBranchSelect = !defaultBranchId;

  useEffect(() => {
    if (defaultBranchId) setSelectedBranchId(defaultBranchId);
  }, [defaultBranchId]);

  const isAdmin = session?.user?.role === "ADMIN";
  const isOrgAdmin = session?.user?.role === "ORG_ADMIN" && !!session?.user?.organizationId;

  const {
    data: branches = [],
    isLoading: branchesLoading,
    isError: isBranchesError,
    error: branchesError,
  } = useQuery<Branch[]>({
    queryKey: ["branches"],
    queryFn: async () => {
      const res = await fetch("/api/branches?limit=100");
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? `Failed to load branches (${res.status})`);
      return (data.data ?? []) as Branch[];
    },
  });

  useEffect(() => {
    if (defaultBranchId) return;
    if (branches.length === 0) return;
    setSelectedBranchId((prev) => prev || branches[0]!._id);
  }, [defaultBranchId, branches]);

  const branchIdForInventory = selectedBranchId || defaultBranchId;
  const inventoryQueryEnabled = isOrgAdmin || !!branchIdForInventory;

  const [orgFilter, setOrgFilter] = useState("all");

  const [movementOpen, setMovementOpen] = useState(false);
  const [movementForm, setMovementForm] = useState<MovementForm>(defaultMovementForm);
  const [formError, setFormError] = useState("");
  const [page, setPage] = useState(1);
  const [movPage, setMovPage] = useState(1);

  const [orgTransferOpen, setOrgTransferOpen] = useState(false);
  const [orgTransferForm, setOrgTransferForm] = useState<OrgTransferForm>(defaultOrgTransferForm);
  const [orgTransferError, setOrgTransferError] = useState("");

  const {
    data: inventoryData,
    isLoading: inventoryLoading,
    isError: isInventoryError,
    error: inventoryError,
  } = useQuery({
    queryKey: ["inventory", branchIdForInventory, session?.user?.organizationId, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (branchIdForInventory) params.set("branchId", branchIdForInventory);
      const res = await fetch(`/api/inventory?${params}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? `Failed to load inventory (${res.status})`);
      return {
        data: (data.data ?? []) as InventoryItem[],
        meta: data.meta as { total: number } | undefined,
      };
    },
    enabled: inventoryQueryEnabled,
  });

  const {
    data: movementsData,
    isLoading: movementsLoading,
    isError: isMovementsError,
    error: movementsError,
  } = useQuery({
    queryKey: ["movements", branchIdForInventory, session?.user?.organizationId, movPage],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(movPage), limit: "20" });
      if (branchIdForInventory) params.set("branchId", branchIdForInventory);
      const res = await fetch(`/api/inventory/movements?${params}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? `Failed to load movements (${res.status})`);
      return {
        data: (data.data ?? []) as StockMovement[],
        meta: data.meta as { total: number } | undefined,
      };
    },
    enabled: inventoryQueryEnabled,
  });

  const {
    data: products = [],
    isError: isProductsError,
    error: productsError,
  } = useQuery<Product[]>({
    queryKey: ["products-simple"],
    queryFn: async () => {
      const res = await fetch("/api/products?limit=100&isActive=true");
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? `Failed to load products (${res.status})`);
      return (data.data ?? []) as Product[];
    },
  });

  const {
    data: orgInventory = [],
    isLoading: orgInventoryLoading,
    isError: isOrgInventoryError,
    error: orgInventoryError,
  } = useQuery<OrgInventoryItem[]>({
    queryKey: ["org-inventory", orgFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (orgFilter !== "all") params.set("organizationId", orgFilter);
      const res = await fetch(`/api/organization-inventory?${params}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? `Failed to load organization inventory (${res.status})`);
      return (data.data ?? []) as OrgInventoryItem[];
    },
    enabled: isAdmin,
  });

  const {
    data: orgsResult,
    isError: isOrgsError,
    error: orgsError,
  } = useQuery({
    queryKey: ["organizations-for-purchase-orders"],
    queryFn: async () => {
      const res = await fetch("/api/organizations/for-purchase-orders");
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? `Failed to load organizations (${res.status})`);
      return (data.data ?? []) as { _id: string; name: string; type: string }[];
    },
    enabled: isAdmin,
  });
  const organizations = orgsResult ?? [];

  const movementMutation = useMutation({
    mutationFn: async (form: MovementForm) => {
      const res = await fetch("/api/inventory/movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, branchId: branchIdForInventory }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? `Movement failed (${res.status})`);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["movements"] });
      toast({ title: "Stock movement recorded" });
      setMovementOpen(false);
      setMovementForm(defaultMovementForm);
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const orgTransferMutation = useMutation({
    mutationFn: async (form: OrgTransferForm) => {
      const res = await fetch("/api/inventory/org-transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? `Transfer failed (${res.status})`);
      return data.data;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["org-inventory"] });
      queryClient.invalidateQueries({ queryKey: ["movements"] });
      toast({ title: `Transferred ${result.quantity} units from ${result.fromOrg} to ${result.toOrg}` });
      setOrgTransferOpen(false);
      setOrgTransferForm(defaultOrgTransferForm);
    },
    onError: (err: Error) => setOrgTransferError(err.message),
  });

  const inventoryItems = inventoryData?.data ?? [];
  const movements = movementsData?.data ?? [];
  const totalInventory = inventoryData?.meta?.total ?? 0;
  const lowStockCount = inventoryItems.filter(
    (i) => i.quantity <= i.lowStockThreshold
  ).length;
  const outOfStockCount = inventoryItems.filter((i) => i.quantity === 0).length;

  return (
    <div className="flex flex-col">
      <Header title="Inventory" subtitle="Track stock levels and movements" />
      <div className="flex-1 p-6 space-y-6">
        {needsBranchSelect && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-lg border bg-card p-4">
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4 shrink-0 mt-0.5" />
              <span>Your account is not tied to a default branch. Choose which branch&apos;s stock and movements to view.</span>
            </div>
            {branchesLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground self-center sm:self-auto" />
            ) : branches.length === 0 ? (
              <p className="text-sm text-destructive">No branches found. Create one under Admin → Branches.</p>
            ) : (
              <Select
                value={selectedBranchId || undefined}
                onValueChange={(id) => {
                  setSelectedBranchId(id);
                  setPage(1);
                  setMovPage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-64">
                  <SelectValue placeholder="Choose branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b._id} value={b._id}>
                      {b.name} ({b.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}
        {isInventoryError && (
          <Alert variant="destructive">
            <AlertDescription>
              {inventoryError instanceof Error ? inventoryError.message : "Unable to load branch inventory."}
            </AlertDescription>
          </Alert>
        )}
        {isMovementsError && (
          <Alert variant="destructive">
            <AlertDescription>
              {movementsError instanceof Error ? movementsError.message : "Unable to load stock movements."}
            </AlertDescription>
          </Alert>
        )}
        {isProductsError && (
          <Alert variant="destructive">
            <AlertDescription>
              {productsError instanceof Error ? productsError.message : "Unable to load product list for forms."}
            </AlertDescription>
          </Alert>
        )}
        {isBranchesError && (
          <Alert variant="destructive">
            <AlertDescription>
              {branchesError instanceof Error ? branchesError.message : "Unable to load branches for transfers."}
            </AlertDescription>
          </Alert>
        )}

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard
            title="Total Products"
            value={totalInventory}
            icon={Boxes}
            description="Tracked items"
          />
          <StatCard
            title="Low Stock"
            value={lowStockCount}
            icon={AlertTriangle}
            description="Below threshold"
            iconClassName="bg-yellow-100"
          />
          <StatCard
            title="Out of Stock"
            value={outOfStockCount}
            icon={TrendingDown}
            description="Zero quantity"
            iconClassName="bg-red-100"
          />
          <StatCard
            title="Recent Movements"
            value={movementsData?.meta?.total ?? 0}
            icon={ArrowDownUp}
            description="Total logged"
            iconClassName="bg-blue-100"
          />
        </div>

        <div className="flex justify-end gap-2">
          {isAdmin && (
            <Button
              variant="outline"
              onClick={() => { setOrgTransferForm(defaultOrgTransferForm); setOrgTransferError(""); setOrgTransferOpen(true); }}
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              Org Transfer
            </Button>
          )}
          <RoleGuard requiredPermissions={["manage:inventory"]}>
            <Button onClick={() => { setMovementForm(defaultMovementForm); setFormError(""); setMovementOpen(true); }}>
              <ArrowDownUp className="h-4 w-4 mr-2" />
              Record Movement
            </Button>
          </RoleGuard>
        </div>

        <Tabs defaultValue="stock">
          <TabsList>
            <TabsTrigger value="stock">Current Stock</TabsTrigger>
            <TabsTrigger value="movements">Movement Log</TabsTrigger>
            {isAdmin && <TabsTrigger value="organizations">Organizations</TabsTrigger>}
          </TabsList>

          <TabsContent value="stock" className="mt-4">
            <StockTable
              data={inventoryItems}
              loading={inventoryLoading}
              page={page}
              totalPages={Math.ceil(totalInventory / 20)}
              onPageChange={setPage}
            />
          </TabsContent>

          <TabsContent value="movements" className="mt-4">
            <MovementLog
              data={movements}
              loading={movementsLoading}
              page={movPage}
              totalPages={Math.ceil((movementsData?.meta?.total ?? 0) / 20)}
              onPageChange={setMovPage}
            />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="organizations" className="mt-4 space-y-4">
              {isOrgsError && (
                <Alert variant="destructive">
                  <AlertDescription>
                    {orgsError instanceof Error ? orgsError.message : "Unable to load organizations."}
                  </AlertDescription>
                </Alert>
              )}
              <div className="flex gap-2">
                <Select value={orgFilter} onValueChange={setOrgFilter}>
                  <SelectTrigger className="w-52">
                    <SelectValue placeholder="All organizations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All organizations</SelectItem>
                    {organizations.map((org) => (
                      <SelectItem key={org._id} value={org._id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {isOrgInventoryError ? (
                <Alert variant="destructive">
                  <AlertDescription>
                    {orgInventoryError instanceof Error
                      ? orgInventoryError.message
                      : "Unable to load organization inventory."}
                  </AlertDescription>
                </Alert>
              ) : orgInventoryLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : orgInventory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                  <Building2 className="h-8 w-8 opacity-40" />
                  <p className="text-sm">No organization inventory yet. Fulfill a PO to populate stock.</p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left px-4 py-2 font-medium">Organization</th>
                        <th className="text-left px-4 py-2 font-medium">Product</th>
                        <th className="text-right px-4 py-2 font-medium">In Stock</th>
                        <th className="text-right px-4 py-2 font-medium">Total Received</th>
                        <th className="text-right px-4 py-2 font-medium">Total Sold</th>
                        <th className="text-right px-4 py-2 font-medium">Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {orgInventory.map((item) => (
                        <tr key={item._id} className="hover:bg-muted/50">
                          <td className="px-4 py-3">
                            <p className="font-medium">{item.organizationId?.name}</p>
                            <p className="text-xs text-muted-foreground capitalize">{item.organizationId?.type}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium">{item.productId?.name}</p>
                            <p className="text-xs text-muted-foreground">{item.productId?.sku}</p>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={item.quantity === 0 ? "text-destructive font-medium" : item.quantity <= 5 ? "text-yellow-600 font-medium" : "font-medium"}>
                              {item.quantity}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-muted-foreground">{item.totalReceived}</td>
                          <td className="px-4 py-3 text-right text-muted-foreground">{item.totalSold}</td>
                          <td className="px-4 py-3 text-right font-medium">
                            {money(item.quantity * (item.productId?.retailPrice ?? 0))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Org Transfer Dialog */}
      <Dialog
        open={orgTransferOpen}
        onOpenChange={(v) => {
          setOrgTransferOpen(v);
          if (!v) setOrgTransferError("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Organization Stock Transfer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {orgTransferError && (
              <Alert variant="destructive">
                <AlertDescription>{orgTransferError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label>From Organization *</Label>
              <Select
                value={orgTransferForm.fromOrganizationId}
                onValueChange={(v) => setOrgTransferForm((f) => ({ ...f, fromOrganizationId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select source org" />
                </SelectTrigger>
                <SelectContent>
                  {organizations
                    .filter((o) => o._id !== orgTransferForm.toOrganizationId)
                    .map((o) => (
                      <SelectItem key={o._id} value={o._id}>
                        {o.name} <span className="text-muted-foreground capitalize ml-1">({o.type})</span>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>To Organization *</Label>
              <Select
                value={orgTransferForm.toOrganizationId}
                onValueChange={(v) => setOrgTransferForm((f) => ({ ...f, toOrganizationId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select destination org" />
                </SelectTrigger>
                <SelectContent>
                  {organizations
                    .filter((o) => o._id !== orgTransferForm.fromOrganizationId)
                    .map((o) => (
                      <SelectItem key={o._id} value={o._id}>
                        {o.name} <span className="text-muted-foreground capitalize ml-1">({o.type})</span>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Product *</Label>
              <Select
                value={orgTransferForm.productId}
                onValueChange={(v) => setOrgTransferForm((f) => ({ ...f, productId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p._id} value={p._id}>
                      {p.name} ({p.sku})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Quantity *</Label>
              <Input
                type="number"
                min={1}
                value={orgTransferForm.quantity}
                onChange={(e) =>
                  setOrgTransferForm((f) => ({ ...f, quantity: parseInt(e.target.value) || 1 }))
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Reference</Label>
                <Input
                  value={orgTransferForm.reference}
                  onChange={(e) => setOrgTransferForm((f) => ({ ...f, reference: e.target.value }))}
                  placeholder="DR#, WT#, etc."
                />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Input
                  value={orgTransferForm.notes}
                  onChange={(e) => setOrgTransferForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Optional notes"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOrgTransferOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setOrgTransferError("");
                orgTransferMutation.mutate(orgTransferForm);
              }}
              disabled={orgTransferMutation.isPending}
            >
              {orgTransferMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Movement Dialog */}
      <Dialog
        open={movementOpen}
        onOpenChange={(v) => {
          setMovementOpen(v);
          if (!v) setFormError("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Stock Movement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {formError && (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label>Product *</Label>
              <Select
                value={movementForm.productId}
                onValueChange={(v) => setMovementForm((f) => ({ ...f, productId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p._id} value={p._id}>
                      {p.name} ({p.sku})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Movement Type *</Label>
                <Select
                  value={movementForm.type}
                  onValueChange={(v) =>
                    setMovementForm((f) => ({ ...f, type: v as MovementForm["type"] }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IN">Stock In (Receive)</SelectItem>
                    <SelectItem value="OUT">Stock Out (Manual)</SelectItem>
                    <SelectItem value="TRANSFER">Transfer to Branch</SelectItem>
                    <SelectItem value="ADJUSTMENT">Adjustment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Quantity *</Label>
                <Input
                  type="number"
                  min={1}
                  value={movementForm.quantity}
                  onChange={(e) =>
                    setMovementForm((f) => ({ ...f, quantity: parseInt(e.target.value) || 1 }))
                  }
                />
              </div>
            </div>

            {movementForm.type === "IN" && (
              <div className="space-y-2">
                <Label>Unit Cost</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={movementForm.unitCost}
                  onChange={(e) =>
                    setMovementForm((f) => ({ ...f, unitCost: parseFloat(e.target.value) || 0 }))
                  }
                />
              </div>
            )}

            {movementForm.type === "TRANSFER" && (
              <div className="space-y-2">
                <Label>Transfer To Branch *</Label>
                <Select
                  value={movementForm.toBranchId}
                  onValueChange={(v) => setMovementForm((f) => ({ ...f, toBranchId: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select destination branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches
                      .filter((b) => b._id !== branchIdForInventory)
                      .map((b) => (
                        <SelectItem key={b._id} value={b._id}>
                          {b.name} ({b.code})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Reference</Label>
                <Input
                  value={movementForm.reference}
                  onChange={(e) => setMovementForm((f) => ({ ...f, reference: e.target.value }))}
                  placeholder="PO#, DR#, etc."
                />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Input
                  value={movementForm.notes}
                  onChange={(e) => setMovementForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Optional notes"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMovementOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setFormError("");
                movementMutation.mutate(movementForm);
              }}
              disabled={movementMutation.isPending}
            >
              {movementMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
