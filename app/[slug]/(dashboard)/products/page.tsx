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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, Loader2, Package, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { useTenantFetch } from "@/hooks/useTenantFetch";
import { formatCurrency } from "@/lib/utils";
import type { ProductCategory } from "@/types";

interface Product {
  _id: string;
  name: string;
  sku: string;
  category: ProductCategory;
  retailPrice: number;
  memberPrice: number;
  distributorPrice: number;
  cost: number;
  isActive: boolean;
  images: string[];
}

interface ProductForm {
  name: string;
  description: string;
  category: ProductCategory | "";
  sku: string;
  barcode: string;
  retailPrice: number;
  memberPrice: number;
  distributorPrice: number;
  cost: number;
  isActive: boolean;
  tags: string;
}

const defaultForm: ProductForm = {
  name: "",
  description: "",
  category: "",
  sku: "",
  barcode: "",
  retailPrice: 0,
  memberPrice: 0,
  distributorPrice: 0,
  cost: 0,
  isActive: true,
  tags: "",
};

const CATEGORIES: { value: ProductCategory; label: string }[] = [
  { value: "homecare", label: "Home Care" },
  { value: "cosmetics", label: "Cosmetics" },
  { value: "wellness", label: "Health & Wellness" },
  { value: "scent", label: "Perfumes & Scents" },
];

const CATEGORY_COLORS: Record<ProductCategory, string> = {
  homecare: "bg-blue-100 text-blue-800",
  cosmetics: "bg-pink-100 text-pink-800",
  wellness: "bg-green-100 text-green-800",
  scent: "bg-purple-100 text-purple-800",
};

export default function ProductsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const apiFetch = useTenantFetch();

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(defaultForm);
  const [formError, setFormError] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products", activeCategory, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeCategory && activeCategory !== "all") params.set("category", activeCategory);
      if (search) params.set("search", search);
      const res = await apiFetch(`/api/products?${params}`);
      const data = await res.json();
      return (data.data ?? []) as Product[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const url = editId ? `/api/products/${editId}` : "/api/products";
      const method = editId ? "PATCH" : "POST";
      const payload = {
        ...form,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        category: form.category || undefined,
      };
      const res = await apiFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: editId ? "Product updated" : "Product created" });
      setOpen(false);
      resetForm();
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiFetch(`/api/products/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Product deleted" });
    },
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  function resetForm() {
    setForm(defaultForm);
    setEditId(null);
    setFormError("");
  }

  function openEdit(product: Product) {
    setForm({
      name: product.name,
      description: "",
      category: product.category,
      sku: product.sku,
      barcode: "",
      retailPrice: product.retailPrice,
      memberPrice: product.memberPrice,
      distributorPrice: product.distributorPrice,
      cost: product.cost,
      isActive: product.isActive,
      tags: "",
    });
    setEditId(product._id);
    setFormError("");
    setOpen(true);
  }

  const columns = [
    {
      key: "name",
      label: "Product",
      render: (p: Product) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
            <Package className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">{p.name}</p>
            <p className="text-xs text-muted-foreground">{p.sku}</p>
          </div>
        </div>
      ),
    },
    {
      key: "category",
      label: "Category",
      render: (p: Product) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[p.category]}`}
        >
          {CATEGORIES.find((c) => c.value === p.category)?.label ?? p.category}
        </span>
      ),
    },
    {
      key: "pricing",
      label: "Pricing",
      render: (p: Product) => (
        <div className="text-sm space-y-0.5">
          <div>
            <span className="text-muted-foreground">Retail: </span>
            <span className="font-medium">{formatCurrency(p.retailPrice)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Member: </span>
            <span className="text-primary font-medium">{formatCurrency(p.memberPrice)}</span>
          </div>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (p: Product) => (
        <Badge variant={p.isActive ? "success" : "secondary"}>
          {p.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (p: Product) => (
        <div className="flex gap-2 justify-end">
          <RoleGuard requiredPermissions={["manage:products"]}>
            <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive"
              onClick={() => deleteMutation.mutate(p._id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </RoleGuard>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col">
      <Header title="Products" subtitle="Manage your product catalog" />
      <div className="flex-1 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <RoleGuard requiredPermissions={["manage:products"]}>
            <Button onClick={() => { resetForm(); setOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </RoleGuard>
        </div>

        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            {CATEGORIES.map((c) => (
              <TabsTrigger key={c.value} value={c.value}>
                {c.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <DataTable
          columns={columns}
          data={products}
          loading={isLoading}
          keyExtractor={(p) => p._id}
          emptyMessage="No products found."
        />
      </div>

      {/* Product Form Dialog */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Product" : "Create Product"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {formError && (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Product Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Rose Hip Face Serum"
                />
              </div>

              <div className="space-y-2">
                <Label>Category *</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm((f) => ({ ...f, category: v as ProductCategory }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>SKU *</Label>
                <Input
                  value={form.sku}
                  onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value.toUpperCase() }))}
                  placeholder="e.g. SKU-001"
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Product description"
                />
              </div>

              <div className="space-y-2">
                <Label>Barcode</Label>
                <Input
                  value={form.barcode}
                  onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))}
                  placeholder="Barcode"
                />
              </div>
            </div>

            {/* Pricing */}
            <div>
              <p className="text-sm font-semibold text-muted-foreground mb-3">Pricing</p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { key: "cost", label: "Cost Price" },
                  { key: "retailPrice", label: "Retail Price" },
                  { key: "memberPrice", label: "Member Price" },
                  { key: "distributorPrice", label: "Distributor Price" },
                ].map(({ key, label }) => (
                  <div key={key} className="space-y-2">
                    <Label>{label} *</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={(form as unknown as Record<string, number>)[key]}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, [key]: parseFloat(e.target.value) || 0 }))
                      }
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tags (comma separated)</Label>
              <Input
                value={form.tags}
                onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                placeholder="e.g. organic, bestseller, new"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editId ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
