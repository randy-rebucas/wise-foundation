"use client";

import { useRef, useState } from "react";
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
  Copy,
  Loader2,
  Package,
  Search,
  Layers,
  X,
  Download,
  Upload,
  FileSpreadsheet,
  Dices,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { RoleGuard } from "@/components/layout/RoleGuard";
import {
  ImageGalleryEditor,
  DEFAULT_MAX_GALLERY_IMAGES,
} from "@/components/products/ImageGalleryEditor";
import { FileDropzone } from "@/components/shared/FileDropzone";
import { uploadProductImageFiles } from "@/lib/client/uploadProductImages";

import { useFormatCurrency } from "@/components/providers/TenantProvider";
import { useImageUploadEnabled } from "@/hooks/useImageUploadEnabled";
import type { ProductCategory } from "@/types";

interface Product {
  _id: string;
  name: string;
  sku: string;
  category: ProductCategory;
  retailPrice: number;
  isActive: boolean;
  images: string[];
  description?: string;
  barcode?: string;
  variantCount?: number | null;
  variantPreviewName?: string | null;
  variantPreviewSku?: string | null;
}

interface Variant {
  _id: string;
  name: string;
  sku: string;
  attributes: { key: string; value: string }[];
  retailPrice: number;
  isActive: boolean;
  images: string[];
}

interface VariantForm {
  name: string;
  sku: string;
  retailPrice: number;
  attributes: { key: string; value: string }[];
  images: string[];
}

const defaultVariantForm: VariantForm = {
  name: "",
  sku: "",
  retailPrice: 0,
  attributes: [{ key: "", value: "" }],
  images: [],
};

interface ProductForm {
  name: string;
  description: string;
  category: ProductCategory | "";
  sku: string;
  barcode: string;
  retailPrice: number;
  isActive: boolean;
  tags: string;
  images: string[];
}

const defaultForm: ProductForm = {
  name: "",
  description: "",
  category: "",
  sku: "",
  barcode: "",
  retailPrice: 0,
  isActive: true,
  tags: "",
  images: [],
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
  "sku,name,description,category,barcode,retailprice,isactive,tags\r\n" +
  "EX-SKU-001,Example Product,,homecare,,12.99,true,demo\r\n";

const SKU_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomBytes(n: number): Uint8Array {
  const buf = new Uint8Array(n);
  crypto.getRandomValues(buf);
  return buf;
}

/** Uppercase alphanumeric SKU, max length within API limits (e.g. 50). */
function randomProductSku(): string {
  const bytes = randomBytes(8);
  let suffix = "";
  for (let i = 0; i < 8; i++) suffix += SKU_CHARS[bytes[i]! % SKU_CHARS.length]!;
  return `SKU-${suffix}`;
}

/** 13-digit EAN-13 with a valid check digit (works with typical scanners). */
function randomEan13Barcode(): string {
  const bytes = randomBytes(12);
  let body = "";
  for (let i = 0; i < 12; i++) body += String(bytes[i]! % 10);
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const n = body.charCodeAt(i) - 48;
    sum += i % 2 === 0 ? n : n * 3;
  }
  const check = (10 - (sum % 10)) % 10;
  return body + check;
}

const MAX_GALLERY_IMAGES = DEFAULT_MAX_GALLERY_IMAGES;

export default function ProductsPage() {
  const money = useFormatCurrency();
  const { configured: imageUploadEnabled } = useImageUploadEnabled();
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
  const [productImageUploading, setProductImageUploading] = useState(false);
  const [variantImageUploading, setVariantImageUploading] = useState(false);
  const productUploadsInFlight = useRef(0);
  const variantUploadsInFlight = useRef(0);
  const [productPendingUploadCount, setProductPendingUploadCount] = useState(0);
  const [variantPendingUploadCount, setVariantPendingUploadCount] = useState(0);
  const [importSummary, setImportSummary] = useState<{
    created: number;
    updated: number;
    errors: { row: number; sku?: string; message: string }[];
  } | null>(null);
  const {
    data: products = [],
    isLoading,
    isError: isProductsError,
    error: productsError,
  } = useQuery({
    queryKey: ["products", activeCategory, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeCategory && activeCategory !== "all") params.set("category", activeCategory);
      if (search) params.set("search", search);
      params.set("includeVariantSummary", "true");
      const res = await fetch(`/api/products?${params}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? `Failed to load products (${res.status})`);
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
        images: form.images,
      };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? `Save failed (${res.status})`);
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
      if (!data.success) throw new Error(data.error ?? `Delete failed (${res.status})`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Product deleted" });
    },
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  const cloneMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/products/${id}/clone`, { method: "POST" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? `Clone failed (${res.status})`);
      return data.data as Product;
    },
    onSuccess: (cloned) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({
        title: "Product cloned",
        description: `${cloned.name} (${cloned.sku})`,
      });
    },
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  const {
    data: variants = [],
    isLoading: variantsLoading,
    isError: isVariantsError,
    error: variantsError,
  } = useQuery({
    queryKey: ["variants", variantsProduct?._id],
    queryFn: async () => {
      const res = await fetch(`/api/products/${variantsProduct!._id}/variants`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? `Failed to load variants (${res.status})`);
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
        images: variantForm.images,
      };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? `Variant save failed (${res.status})`);
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
      if (!data.success) throw new Error(data.error ?? `Delete variant failed (${res.status})`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["variants", variantsProduct?._id] });
      toast({ title: "Variant deleted" });
    },
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  function closeVariantsDialog() {
    setVariantPendingUploadCount(0);
    setVariantsProduct(null);
  }

  async function uploadProductImages(files: File[]) {
    if (!files.length) return;

    const batchSize = files.length;
    setProductPendingUploadCount((c) => c + batchSize);
    productUploadsInFlight.current += 1;
    setProductImageUploading(true);
    try {
      const urls = await uploadProductImageFiles(files);
      setForm((f) => ({ ...f, images: [...f.images, ...urls] }));
      queryClient.invalidateQueries({ queryKey: ["media"] });
      toast({ title: "Images uploaded", description: `${urls.length} file(s) added.` });
    } catch (err) {
      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setProductPendingUploadCount((c) => Math.max(0, c - batchSize));
      productUploadsInFlight.current -= 1;
      if (productUploadsInFlight.current <= 0) {
        productUploadsInFlight.current = 0;
        setProductImageUploading(false);
      }
    }
  }

  async function uploadVariantImages(files: File[]) {
    if (!files.length) return;

    const batchSize = files.length;
    setVariantPendingUploadCount((c) => c + batchSize);
    variantUploadsInFlight.current += 1;
    setVariantImageUploading(true);
    try {
      const urls = await uploadProductImageFiles(files);
      setVariantForm((f) => ({ ...f, images: [...f.images, ...urls] }));
      queryClient.invalidateQueries({ queryKey: ["media"] });
      toast({ title: "Images uploaded", description: `${urls.length} file(s) added.` });
    } catch (err) {
      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setVariantPendingUploadCount((c) => Math.max(0, c - batchSize));
      variantUploadsInFlight.current -= 1;
      if (variantUploadsInFlight.current <= 0) {
        variantUploadsInFlight.current = 0;
        setVariantImageUploading(false);
      }
    }
  }

  function openCreateVariant() {
    setVariantPendingUploadCount(0);
    setVariantForm(defaultVariantForm);
    setEditVariantId(null);
    setVariantError("");
    setVariantFormOpen(true);
  }

  function openEditVariant(v: Variant) {
    setVariantPendingUploadCount(0);
    setVariantForm({
      name: v.name,
      sku: v.sku,
      retailPrice: v.retailPrice,
      attributes: v.attributes.length ? v.attributes : [{ key: "", value: "" }],
      images: v.images ?? [],
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
    setProductPendingUploadCount(0);
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
      if (!data.success) throw new Error(data.error ?? `Import failed (${res.status})`);
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
    setProductPendingUploadCount(0);
    setForm({
      name: product.name,
      description: product.description ?? "",
      category: product.category,
      sku: product.sku,
      barcode: product.barcode ?? "",
      retailPrice: product.retailPrice,
      isActive: product.isActive,
      tags: "",
      images: product.images ?? [],
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
          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden border">
            {p.images?.[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.images[0]} alt="" className="h-full w-full object-cover" />
            ) : (
              <Package className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          <div>
            <p className="font-medium">{p.name}</p>
            <p className="text-xs text-muted-foreground">
              {p.sku}
              {typeof p.variantCount === "number" && p.variantCount > 0 && (
                <>
                  {" "}
                  · {p.variantCount} variant{p.variantCount === 1 ? "" : "s"}
                  {p.variantPreviewSku ? <> (e.g. {p.variantPreviewSku})</> : null}
                </>
              )}
            </p>
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
      label: "Retail",
      render: (p: Product) => (
        <div className="text-sm">
          <span className="font-medium">{money(p.retailPrice)}</span>
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
              setVariantPendingUploadCount(0);
              setVariantsProduct(p);
              setVariantFormOpen(false);
              setVariantForm(defaultVariantForm);
              setEditVariantId(null);
            }}
          >
            <Layers className="h-4 w-4" />
          </Button>
          <RoleGuard requiredPermissions={["manage:products"]}>
            <Button
              variant="ghost"
              size="icon"
              title="Duplicate product"
              aria-label="Duplicate product"
              disabled={cloneMutation.isPending}
              onClick={() => cloneMutation.mutate(p._id)}
            >
              {cloneMutation.isPending && cloneMutation.variables === p._id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
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
        {isProductsError && (
          <Alert variant="destructive">
            <AlertDescription>
              {productsError instanceof Error ? productsError.message : "Unable to load products."}
            </AlertDescription>
          </Alert>
        )}
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
                sku, name, category, retailprice
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
              <FileDropzone
                accept=".csv,text/csv"
                disabled={importBusy}
                onFilesSelected={(files) => {
                  const f = files[0];
                  if (f) void handleImportFile(f);
                }}
                idleLabel={importBusy ? "Importing…" : "Drag a CSV here or click to browse"}
                activeLabel="Drop CSV to import"
                hint=".csv format only"
              >
                {importBusy ? (
                  <>
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="text-sm font-medium">Importing…</span>
                  </>
                ) : undefined}
              </FileDropzone>
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
      <Dialog open={!!variantsProduct} onOpenChange={(o) => !o && closeVariantsDialog()}>
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

            {isVariantsError && (
              <Alert variant="destructive">
                <AlertDescription>
                  {variantsError instanceof Error ? variantsError.message : "Unable to load variants."}
                </AlertDescription>
              </Alert>
            )}

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
                    <div className="flex gap-2">
                      <Input
                        className="flex-1 min-w-0"
                        value={variantForm.sku}
                        onChange={(e) =>
                          setVariantForm((f) => ({ ...f, sku: e.target.value.toUpperCase() }))
                        }
                        placeholder="e.g. SKU-001-50ML"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        title="Generate random SKU"
                        aria-label="Generate random SKU"
                        onClick={() =>
                          setVariantForm((f) => ({ ...f, sku: randomProductSku() }))
                        }
                      >
                        <Dices className="h-4 w-4" />
                      </Button>
                    </div>
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

                <div className="grid grid-cols-1 gap-2 sm:max-w-xs">
                  <div className="space-y-1">
                    <Label className="text-xs">Retail price</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={variantForm.retailPrice}
                      onChange={(e) =>
                        setVariantForm((f) => ({
                          ...f,
                          retailPrice: parseFloat(e.target.value) || 0,
                        }))
                      }
                    />
                  </div>
                </div>

                <ImageGalleryEditor
                  label="Variant photos"
                  size="sm"
                  images={variantForm.images}
                  onImagesChange={(images) => setVariantForm((f) => ({ ...f, images }))}
                  onUploadFiles={uploadVariantImages}
                  pendingUploadCount={variantPendingUploadCount}
                  maxImages={MAX_GALLERY_IMAGES}
                  uploading={variantImageUploading}
                  uploadEnabled={imageUploadEnabled}
                  deleteFromStorageOnRemove={!editVariantId}
                  helperText="Add images by URL or upload JPEG, PNG, WebP, or GIF (up to 5 MB each)."
                />

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
                    onClick={() => {
                      setVariantError("");
                      saveVariantMutation.mutate();
                    }}
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
            ) : isVariantsError ? null : variants.length === 0 ? (
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
                        {money(v.retailPrice)} retail
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
            <Button variant="outline" onClick={() => closeVariantsDialog()}>
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
                <div className="flex gap-2">
                  <Input
                    className="flex-1 min-w-0"
                    value={form.sku}
                    onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value.toUpperCase() }))}
                    placeholder="e.g. SKU-001"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    title="Generate random SKU"
                    aria-label="Generate random SKU"
                    onClick={() => setForm((f) => ({ ...f, sku: randomProductSku() }))}
                  >
                    <Dices className="h-4 w-4" />
                  </Button>
                </div>
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
                <div className="flex gap-2">
                  <Input
                    className="flex-1 min-w-0"
                    value={form.barcode}
                    onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))}
                    placeholder="13-digit EAN-13"
                    inputMode="numeric"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    title="Generate random EAN-13 barcode"
                    aria-label="Generate random EAN-13 barcode"
                    onClick={() => setForm((f) => ({ ...f, barcode: randomEan13Barcode() }))}
                  >
                    <Dices className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <ImageGalleryEditor
              label="Photos"
              images={form.images}
              onImagesChange={(images) => setForm((f) => ({ ...f, images }))}
              onUploadFiles={uploadProductImages}
              pendingUploadCount={productPendingUploadCount}
              maxImages={MAX_GALLERY_IMAGES}
              uploading={productImageUploading}
              uploadEnabled={imageUploadEnabled}
              deleteFromStorageOnRemove={!editId}
              helperText={
                imageUploadEnabled
                  ? "Add images by URL or upload JPEG, PNG, WebP, or GIF (up to 5 MB each, saved under public/uploads)."
                  : "Add images by URL. To enable uploads, ensure the server can write to public/uploads."
              }
            />

            {/* Pricing */}
            <div>
              <p className="text-sm font-semibold text-muted-foreground mb-3">Pricing</p>
              <div className="grid grid-cols-1 gap-4 sm:max-w-xs">
                <div className="space-y-2">
                  <Label>Retail price *</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.retailPrice}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, retailPrice: parseFloat(e.target.value) || 0 }))
                    }
                  />
                </div>
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
            <Button onClick={() => { setFormError(""); saveMutation.mutate(); }} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editId ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
