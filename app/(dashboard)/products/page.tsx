"use client";

import { useState, useRef } from "react";
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
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Package,
  Search,
  Layers,
  X,
  Download,
  Upload,
  FileSpreadsheet,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { RoleGuard } from "@/components/layout/RoleGuard";

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

interface Variant {
  _id: string;
  name: string;
  sku: string;
  attributes: { key: string; value: string }[];
  retailPrice: number;
  memberPrice: number;
  distributorPrice: number;
  cost: number;
  isActive: boolean;
}

interface VariantForm {
  name: string;
  sku: string;
  retailPrice: number;
  memberPrice: number;
  distributorPrice: number;
  cost: number;
  attributes: { key: string; value: string }[];
}

const defaultVariantForm: VariantForm = {
  name: "",
  sku: "",
  retailPrice: 0,
  memberPrice: 0,
  distributorPrice: 0,
  cost: 0,
  attributes: [{ key: "", value: "" }],
};

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

const CSV_TEMPLATE =
  "sku,name,description,category,barcode,retailprice,memberprice,distributorprice,cost,isactive,tags\r\n" +
  "EX-SKU-001,Example Product,,homecare,,12.99,10.99,8.5,5,true,demo\r\n";

export default function ProductsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(defaultForm);
  const [formError, setFormError] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");

  const [variantsProduct, setVariantsProduct] = useState<Product | null>(null);
  const [variantFormOpen, setVariantFormOpen] = useState(false);
  const [editVariantId, setEditVariantId] = useState<string | null>(null);
  const [variantForm, setVariantForm] = useState<VariantForm>(defaultVariantForm);
  const [variantError, setVariantError] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [importSummary, setImportSummary] = useState<{
    created: number;
    updated: number;
    errors: { row: number; sku?: string; message: string }[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products", activeCategory, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeCategory && activeCategory !== "all") params.set("category", activeCategory);
      if (search) params.set("search", search);
      const res = await fetch(`/api/products?${params}`);
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
      const res = await fetch(url, {
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
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Product deleted" });
    },
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  const { data: variants = [], isLoading: variantsLoading } = useQuery({
    queryKey: ["variants", variantsProduct?._id],
    queryFn: async () => {
      const res = await fetch(`/api/products/${variantsProduct!._id}/variants`);
      const data = await res.json();
      return (data.data ?? []) as Variant[];
    },
    enabled: !!variantsProduct,
  });

  const saveVariantMutation = useMutation({
    mutationFn: async () => {
      const url = editVariantId
        ? `/api/products/${variantsProduct!._id}/variants/${editVariantId}`
        : `/api/products/${variantsProduct!._id}/variants`;
      const method = editVariantId ? "PATCH" : "POST";
      const payload = {
        ...variantForm,
        attributes: variantForm.attributes.filter((a) => a.key && a.value),
        images: [],
      };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["variants", variantsProduct?._id] });
      toast({ title: editVariantId ? "Variant updated" : "Variant created" });
      setVariantFormOpen(false);
      setVariantForm(defaultVariantForm);
      setEditVariantId(null);
    },
    onError: (err: Error) => setVariantError(err.message),
  });

  const deleteVariantMutation = useMutation({
    mutationFn: async (variantId: string) => {
      const res = await fetch(
        `/api/products/${variantsProduct!._id}/variants/${variantId}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["variants", variantsProduct?._id] });
      toast({ title: "Variant deleted" });
    },
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  function openCreateVariant() {
    setVariantForm(defaultVariantForm);
    setEditVariantId(null);
    setVariantError("");
    setVariantFormOpen(true);
  }

  function openEditVariant(v: Variant) {
    setVariantForm({
      name: v.name,
      sku: v.sku,
      retailPrice: v.retailPrice,
      memberPrice: v.memberPrice,
      distributorPrice: v.distributorPrice,
      cost: v.cost,
      attributes: v.attributes.length ? v.attributes : [{ key: "", value: "" }],
    });
    setEditVariantId(v._id);
    setVariantError("");
    setVariantFormOpen(true);
  }

  function addAttribute() {
    setVariantForm((f) => ({ ...f, attributes: [...f.attributes, { key: "", value: "" }] }));
  }

  function removeAttribute(i: number) {
    setVariantForm((f) => ({ ...f, attributes: f.attributes.filter((_, idx) => idx !== i) }));
  }

  function updateAttribute(i: number, field: "key" | "value", val: string) {
    setVariantForm((f) => {
      const attrs = [...f.attributes];
      attrs[i] = { ...attrs[i], [field]: val };
      return { ...f, attributes: attrs };
    });
  }

  function resetForm() {
    setForm(defaultForm);
    setEditId(null);
    setFormError("");
  }

  async function handleExportCsv() {
    try {
      const res = await fetch("/api/products/export");
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `Export failed (${res.status})`);
      }
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition");
      const m = cd?.match(/filename="([^"]+)"/);
      const filename = m?.[1] ?? "products-export.csv";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Products exported", description: filename });
    } catch (e) {
      toast({
        title: "Export failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    }
  }

  function downloadTemplate() {
    const blob = new Blob(["\uFEFF", CSV_TEMPLATE], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "products-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Template downloaded" });
  }

  function openImportDialog() {
    setImportSummary(null);
    setImportOpen(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleImportFile(file: File) {
    setImportBusy(true);
    setImportSummary(null);
    try {
      const csv = await file.text();
      const res = await fetch("/api/products/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? "Import failed");
      const result = data.data as {
        created: number;
        updated: number;
        errors: { row: number; sku?: string; message: string }[];
      };
      setImportSummary(result);
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({
        title: "Import complete",
        description: `Created ${result.created}, updated ${result.updated}${
          result.errors.length ? `, ${result.errors.length} row(s) skipped` : ""
        }.`,
      });
    } catch (e) {
      toast({
        title: "Import failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setImportBusy(false);
    }
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
          <Button
            variant="ghost"
            size="icon"
            title="Manage Variants"
            onClick={() => {
              setVariantsProduct(p);
              setVariantFormOpen(false);
              setVariantForm(defaultVariantForm);
              setEditVariantId(null);
            }}
          >
            <Layers className="h-4 w-4" />
          </Button>
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
      <div className="flex-1 space-y-4 p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
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
            <div className="flex flex-wrap gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={handleExportCsv}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Template
              </Button>
              <Button variant="outline" size="sm" onClick={openImportDialog}>
                <Upload className="h-4 w-4 mr-2" />
                Import CSV
              </Button>
              <Button onClick={() => { resetForm(); setOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </div>
          </RoleGuard>
        </div>

        <div className="w-full min-w-0 overflow-x-auto pb-1 -mx-1 px-1 sm:mx-0 sm:px-0">
          <Tabs value={activeCategory} onValueChange={setActiveCategory}>
            <TabsList className="inline-flex h-auto w-max min-w-full flex-wrap justify-start gap-1 p-1 sm:h-10 sm:w-auto sm:flex-nowrap">
              <TabsTrigger value="all" className="text-xs sm:text-sm">
                All
              </TabsTrigger>
              {CATEGORIES.map((c) => (
                <TabsTrigger key={c.value} value={c.value} className="text-xs sm:text-sm">
                  {c.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <DataTable
          columns={columns}
          data={products}
          loading={isLoading}
          keyExtractor={(p) => p._id}
          emptyMessage="No products found."
        />
      </div>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Import products (CSV)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              Required columns:{" "}
              <span className="break-all font-mono text-xs text-foreground">
                sku, name, category, retailprice, memberprice, distributorprice, cost
              </span>
              . Optional: description, barcode, isactive (true/false), tags (separate with{" "}
              <code className="text-xs">;</code>).
            </p>
            <p className="text-foreground">
              Rows with an existing SKU update that product; new SKUs create rows. Product variants are not
              imported here.
            </p>
            <div className="space-y-2">
              <Label className="text-foreground">CSV file</Label>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                disabled={importBusy}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleImportFile(f);
                }}
              />
              {importBusy && (
                <div className="flex items-center gap-2 text-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Importing…
                </div>
              )}
            </div>
            {importSummary && importSummary.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertDescription>
                  <p className="font-medium mb-2 text-foreground">Skipped rows</p>
                  <ul className="max-h-44 overflow-y-auto space-y-1 text-xs">
                    {importSummary.errors.map((err, idx) => (
                      <li key={`${err.row}-${idx}`}>
                        <span className="font-mono">Row {err.row}</span>
                        {err.sku ? ` (${err.sku})` : ""}: {err.message}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
            {importSummary && importSummary.errors.length === 0 && (importSummary.created > 0 || importSummary.updated > 0) && (
              <Alert>
                <AlertDescription>
                  Created {importSummary.created}, updated {importSummary.updated}. No row errors.
                </AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Variants Dialog */}
      <Dialog open={!!variantsProduct} onOpenChange={(o) => !o && setVariantsProduct(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="min-w-0 truncate pr-8">
              Variants — {variantsProduct?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[68vh] overflow-y-auto pr-1">
            <RoleGuard requiredPermissions={["manage:products"]}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (variantFormOpen && !editVariantId) {
                    setVariantFormOpen(false);
                  } else {
                    openCreateVariant();
                  }
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                {variantFormOpen && !editVariantId ? "Cancel" : "Add Variant"}
              </Button>
            </RoleGuard>

            {variantFormOpen && (
              <div className="border rounded-lg p-4 space-y-3">
                <p className="text-sm font-semibold">
                  {editVariantId ? "Edit Variant" : "New Variant"}
                </p>
                {variantError && (
                  <Alert variant="destructive">
                    <AlertDescription>{variantError}</AlertDescription>
                  </Alert>
                )}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Variant Name *</Label>
                    <Input
                      value={variantForm.name}
                      onChange={(e) => setVariantForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="e.g. 50ml"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">SKU *</Label>
                    <Input
                      value={variantForm.sku}
                      onChange={(e) =>
                        setVariantForm((f) => ({ ...f, sku: e.target.value.toUpperCase() }))
                      }
                      placeholder="e.g. SKU-001-50ML"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Attributes</Label>
                    <Button variant="ghost" size="sm" onClick={addAttribute} className="h-6 text-xs">
                      <Plus className="h-3 w-3 mr-1" /> Add
                    </Button>
                  </div>
                  {variantForm.attributes.map((attr, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <Input
                        value={attr.key}
                        onChange={(e) => updateAttribute(i, "key", e.target.value)}
                        placeholder="Key (e.g. Size)"
                        className="flex-1"
                      />
                      <Input
                        value={attr.value}
                        onChange={(e) => updateAttribute(i, "value", e.target.value)}
                        placeholder="Value (e.g. 50ml)"
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => removeAttribute(i)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {(
                    [
                      { key: "cost", label: "Cost" },
                      { key: "retailPrice", label: "Retail" },
                      { key: "memberPrice", label: "Member" },
                      { key: "distributorPrice", label: "Dist." },
                    ] as { key: keyof VariantForm; label: string }[]
                  ).map(({ key, label }) => (
                    <div key={key} className="space-y-1">
                      <Label className="text-xs">{label}</Label>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={variantForm[key] as number}
                        onChange={(e) =>
                          setVariantForm((f) => ({ ...f, [key]: parseFloat(e.target.value) || 0 }))
                        }
                      />
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setVariantFormOpen(false); setEditVariantId(null); }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => saveVariantMutation.mutate()}
                    disabled={saveVariantMutation.isPending}
                  >
                    {saveVariantMutation.isPending && (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    )}
                    {editVariantId ? "Update" : "Create"}
                  </Button>
                </div>
              </div>
            )}

            {variantsLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : variants.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No variants yet.</p>
            ) : (
              <div className="space-y-2">
                {variants.map((v) => (
                  <div
                    key={v._id}
                    className="flex flex-col gap-3 border rounded-lg px-3 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-3 sm:px-4"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium">{v.name}</p>
                        <span className="text-xs text-muted-foreground">{v.sku}</span>
                        <Badge variant={v.isActive ? "success" : "secondary"} className="text-xs">
                          {v.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      {v.attributes.length > 0 && (
                        <div className="flex gap-1 flex-wrap mt-1">
                          {v.attributes.map((a, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {a.key}: {a.value}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatCurrency(v.retailPrice)} retail ·{" "}
                        {formatCurrency(v.memberPrice)} member ·{" "}
                        {formatCurrency(v.distributorPrice)} dist.
                      </p>
                    </div>
                    <RoleGuard requiredPermissions={["manage:products"]}>
                      <div className="flex shrink-0 justify-end gap-1 sm:justify-start">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openEditVariant(v)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => deleteVariantMutation.mutate(v._id)}
                          disabled={deleteVariantMutation.isPending}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </RoleGuard>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVariantsProduct(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
