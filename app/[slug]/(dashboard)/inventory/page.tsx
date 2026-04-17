"use client";

import { useState } from "react";
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
import { Boxes, AlertTriangle, TrendingDown, ArrowDownUp, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { useTenantFetch } from "@/hooks/useTenantFetch";

interface MovementForm {
  productId: string;
  type: "IN" | "OUT" | "TRANSFER" | "ADJUSTMENT";
  quantity: number;
  unitCost: number;
  toBranchId: string;
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

export default function InventoryPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const apiFetch = useTenantFetch();
  const branchId = session?.user?.branchIds?.[0];

  const [movementOpen, setMovementOpen] = useState(false);
  const [movementForm, setMovementForm] = useState<MovementForm>(defaultMovementForm);
  const [formError, setFormError] = useState("");
  const [page, setPage] = useState(1);
  const [movPage, setMovPage] = useState(1);

  const { data: inventoryData, isLoading: inventoryLoading } = useQuery({
    queryKey: ["inventory", branchId, page],
    queryFn: async () => {
      const res = await apiFetch(`/api/inventory?branchId=${branchId}&page=${page}&limit=20`);
      const data = await res.json();
      return data;
    },
    enabled: !!branchId,
  });

  const { data: movementsData, isLoading: movementsLoading } = useQuery({
    queryKey: ["movements", branchId, movPage],
    queryFn: async () => {
      const res = await apiFetch(
        `/api/inventory/movements?branchId=${branchId}&page=${movPage}&limit=20`
      );
      const data = await res.json();
      return data;
    },
    enabled: !!branchId,
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["products-simple"],
    queryFn: async () => {
      const res = await apiFetch("/api/products?limit=100&isActive=true");
      const data = await res.json();
      return data.data ?? [];
    },
  });

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ["branches"],
    queryFn: async () => {
      const res = await apiFetch("/api/branches");
      const data = await res.json();
      return data.data ?? [];
    },
  });

  const movementMutation = useMutation({
    mutationFn: async (form: MovementForm) => {
      const res = await apiFetch("/api/inventory/movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, branchId }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
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

  const inventoryItems = inventoryData?.data ?? [];
  const movements = movementsData?.data ?? [];
  const totalInventory = inventoryData?.meta?.total ?? 0;
  const lowStockCount = inventoryItems.filter(
    (i: { quantity: number; lowStockThreshold: number }) => i.quantity <= i.lowStockThreshold
  ).length;
  const outOfStockCount = inventoryItems.filter(
    (i: { quantity: number }) => i.quantity === 0
  ).length;

  return (
    <div className="flex flex-col">
      <Header title="Inventory" subtitle="Track stock levels and movements" />
      <div className="flex-1 p-6 space-y-6">
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

        <div className="flex justify-end">
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
        </Tabs>
      </div>

      {/* Record Movement Dialog */}
      <Dialog open={movementOpen} onOpenChange={setMovementOpen}>
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
                      .filter((b) => b._id !== branchId)
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
              onClick={() => movementMutation.mutate(movementForm)}
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
