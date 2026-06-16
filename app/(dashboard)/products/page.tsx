"use client";

import { useState } from "react";
import Link from "next/link";
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
  Download,
  Upload,
  FileSpreadsheet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { FileDropzone } from "@/components/shared/FileDropzone";
import { useFormatCurrency } from "@/components/providers/TenantProvider";
import {
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_COLORS,
  PRODUCTS_CSV_TEMPLATE,
} from "@/lib/products/catalog";
import type { ProductCategory } from "@/types";

const PAGE_SIZE = 10;

interface Product {
  _id: string;
  name: string;
  sku: string;
  category: ProductCategory;
  retailPrice: number;
  isActive: boolean;
  marketplaceListed?: boolean;
  images: string[];
  variantCount?: number | null;
  variantPreviewName?: string | null;
  variantPreviewSku?: string | null;
}

export default function ProductsPage() {
  const money = useFormatCurrency();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [importOpen, setImportOpen] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [importSummary, setImportSummary] = useState<{
    created: number;
    updated: number;
    errors: { row: number; sku?: string; message: string }[];
  } | null>(null);

  const {
    data: listResult,
    isLoading,
    isError: isProductsError,
    error: productsError,
  } = useQuery({
    queryKey: ["products", activeCategory, search, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
        includeVariantSummary: "true",
      });
      if (activeCategory && activeCategory !== "all") params.set("category", activeCategory);
      if (search) params.set("search", search);
      const res = await fetch(`/api/products?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? `Failed to load products (${res.status})`);
      return json as {
        data: Product[];
        meta?: { total?: number; page?: number; limit?: number };
      };
    },
  });

  const products = listResult?.data ?? [];
  const total = listResult?.meta?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

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
    const blob = new Blob(["\uFEFF", PRODUCTS_CSV_TEMPLATE], { type: "text/csv;charset=utf-8" });
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

  function categoryLabel(category: ProductCategory) {
    return PRODUCT_CATEGORIES.find((c) => c.value === category)?.label ?? category;
  }

  function ProductActions({ p, className }: { p: Product; className?: string }) {
    return (
      <div className={cn("flex gap-1", className)}>
        <Button variant="ghost" size="icon" title="Manage variants" asChild>
          <Link href={`/products/${p._id}/edit#variants`}>
            <Layers className="h-4 w-4" />
          </Link>
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
          <Button variant="ghost" size="icon" title="Edit product" asChild>
            <Link href={`/products/${p._id}/edit`}>
              <Pencil className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive"
            title="Delete product"
            onClick={() => deleteMutation.mutate(p._id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </RoleGuard>
      </div>
    );
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
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${PRODUCT_CATEGORY_COLORS[p.category]}`}
        >
          {categoryLabel(p.category)}
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
        <div className="flex flex-col gap-1">
          <Badge variant={p.isActive ? "success" : "secondary"}>
            {p.isActive ? "Active" : "Inactive"}
          </Badge>
          <Badge variant={p.marketplaceListed !== false ? "outline" : "secondary"} className="text-[10px]">
            {p.marketplaceListed !== false ? "Online store" : "Hidden online"}
          </Badge>
        </div>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (p: Product) => <ProductActions p={p} className="justify-end gap-2" />,
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
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
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
              <Button asChild>
                <Link href="/products/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
                </Link>
              </Button>
            </div>
          </RoleGuard>
        </div>

        <div className="w-full min-w-0 overflow-x-auto pb-1 -mx-1 px-1 sm:mx-0 sm:px-0">
          <Tabs
            value={activeCategory}
            onValueChange={(v) => {
              setActiveCategory(v);
              setPage(1);
            }}
          >
            <TabsList className="inline-flex h-auto w-max min-w-full flex-wrap justify-start gap-1 p-1 sm:h-10 sm:w-auto sm:flex-nowrap">
              <TabsTrigger value="all" className="text-xs sm:text-sm">
                All
              </TabsTrigger>
              {PRODUCT_CATEGORIES.map((c) => (
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
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
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
              . Optional: shortdescription, description (Markdown), seotitle, seodescription, barcode,
              isactive (true/false), tags (separate with{" "}
              <code className="text-xs">;</code>).
            </p>
            <p className="text-foreground">
              Rows with an existing SKU update that product; new SKUs create rows. Product variants
              are not imported here.
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
            {importSummary &&
              importSummary.errors.length === 0 &&
              (importSummary.created > 0 || importSummary.updated > 0) && (
                <Alert>
                  <AlertDescription>
                    Created {importSummary.created}, updated {importSummary.updated}. No row
                    errors.
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
    </div>
  );
}
