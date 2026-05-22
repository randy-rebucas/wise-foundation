"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import {
  ImageGalleryEditor,
  DEFAULT_MAX_GALLERY_IMAGES,
} from "@/components/products/ImageGalleryEditor";
import { uploadProductImageFiles } from "@/lib/client/uploadProductImages";
import { useImageUploadEnabled } from "@/hooks/useImageUploadEnabled";
import { useToast } from "@/hooks/use-toast";
import { MarkdownEditor } from "@/components/shared/MarkdownEditor";
import { Dices, Loader2 } from "lucide-react";
import {
  PRODUCT_CATEGORIES,
  randomEan13Barcode,
  randomProductSku,
} from "@/lib/products/catalog";
import {
  PRODUCT_SEO_DESCRIPTION_MAX,
  PRODUCT_SEO_TITLE_MAX,
} from "@/lib/products/seoLimits";
import {
  buildProductSavePayload,
  defaultProductFormValues,
  type ProductFormValues,
  type SavedProduct,
} from "@/lib/products/productForm";
import type { ProductCategory } from "@/types";

const MAX_GALLERY_IMAGES = DEFAULT_MAX_GALLERY_IMAGES;

export type ProductFormProps = {
  mode: "create" | "edit";
  productId?: string;
  initialValues?: ProductFormValues;
  onSuccess: (product: SavedProduct) => void;
  onCancel: () => void;
  showFooter?: boolean;
};

export function ProductForm({
  mode,
  productId,
  initialValues,
  onSuccess,
  onCancel,
  showFooter = true,
}: ProductFormProps) {
  const isEdit = mode === "edit" && !!productId;
  const { configured: imageUploadEnabled } = useImageUploadEnabled();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<ProductFormValues>(
    initialValues ?? defaultProductFormValues
  );
  const [formError, setFormError] = useState("");
  const [productImageUploading, setProductImageUploading] = useState(false);
  const [productPendingUploadCount, setProductPendingUploadCount] = useState(0);
  const productUploadsInFlight = useRef(0);

  useEffect(() => {
    if (initialValues) {
      setForm(initialValues);
      setFormError("");
      setProductPendingUploadCount(0);
    }
  }, [initialValues]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const url = isEdit ? `/api/products/${productId}` : "/api/products";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildProductSavePayload(form)),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? `Save failed (${res.status})`);
      return data.data as SavedProduct;
    },
    onSuccess: (product) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      if (productId) {
        queryClient.invalidateQueries({ queryKey: ["product", productId] });
      }
      onSuccess(product);
    },
    onError: (err: Error) => setFormError(err.message),
  });

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

  function handleSubmit() {
    setFormError("");
    saveMutation.mutate();
  }

  return (
    <div className="space-y-4">
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
              {PRODUCT_CATEGORIES.map((c) => (
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

        <MarkdownEditor
          id="shortDescription"
          className="sm:col-span-2"
          label="Short description"
          value={form.shortDescription}
          onChange={(shortDescription) => setForm((f) => ({ ...f, shortDescription }))}
          placeholder="Brief summary — **bold**, lists, links supported"
          minRows={3}
          maxLength={500}
          helperText={
            <p className="text-xs text-muted-foreground">
              {form.shortDescription.length}/500 · Markdown supported. Plain-text excerpt is used for
              SEO when no custom meta description is set.
            </p>
          }
        />

        <MarkdownEditor
          id="description"
          className="sm:col-span-2"
          label="Full description"
          value={form.description}
          onChange={(description) => setForm((f) => ({ ...f, description }))}
          placeholder="Ingredients, usage, benefits — use headings, lists, and **emphasis**"
          minRows={8}
        />

        <div className="space-y-3 sm:col-span-2 rounded-lg border bg-muted/40 p-4">
          <div>
            <p className="text-sm font-medium">SEO (optional)</p>
            <p className="text-xs text-muted-foreground">
              Overrides for search engines and social sharing. Leave blank to use name and short
              description.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="seoTitle">SEO title</Label>
              <Input
                id="seoTitle"
                value={form.seoTitle}
                onChange={(e) => setForm((f) => ({ ...f, seoTitle: e.target.value }))}
                placeholder={`Custom page title (max ${PRODUCT_SEO_TITLE_MAX} characters)`}
                maxLength={PRODUCT_SEO_TITLE_MAX}
              />
              <p className="text-xs text-muted-foreground">
                {form.seoTitle.length}/{PRODUCT_SEO_TITLE_MAX}
              </p>
            </div>
            <MarkdownEditor
              id="seoDescription"
              className="sm:col-span-2"
              label="SEO meta description"
              value={form.seoDescription}
              onChange={(seoDescription) => setForm((f) => ({ ...f, seoDescription }))}
              placeholder="Custom meta description (plain text used in search results)"
              minRows={2}
              maxLength={PRODUCT_SEO_DESCRIPTION_MAX}
              helperText={
                <p className="text-xs text-muted-foreground">
                  {form.seoDescription.length}/{PRODUCT_SEO_DESCRIPTION_MAX} · Stored as Markdown;
                  search engines receive plain text.
                </p>
              }
            />
          </div>
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
        deleteFromStorageOnRemove={!isEdit}
        helperText={
          imageUploadEnabled
            ? "Add images by URL or upload JPEG, PNG, WebP, or GIF (up to 5 MB each). The first image is the cover; order matches the gallery on the product page."
            : "Add images by URL. The first image is the cover. To enable uploads, configure Cloudinary or a writable public/uploads folder."
        }
      />

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

      <div className="flex flex-wrap gap-6 pt-1">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
            className="h-4 w-4 rounded border-input accent-primary"
          />
          <span className="text-sm">Active in POS and inventory</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={form.marketplaceListed}
            onChange={(e) => setForm((f) => ({ ...f, marketplaceListed: e.target.checked }))}
            className="h-4 w-4 rounded border-input accent-primary"
          />
          <span className="text-sm">List on online store</span>
        </label>
      </div>

      {showFooter && (
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={saveMutation.isPending}>
            {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {isEdit ? "Update product" : "Create product"}
          </Button>
        </div>
      )}
    </div>
  );
}
