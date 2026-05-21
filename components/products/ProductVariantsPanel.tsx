"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ImageGalleryEditor,
  DEFAULT_MAX_GALLERY_IMAGES,
} from "@/components/products/ImageGalleryEditor";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { uploadProductImageFiles } from "@/lib/client/uploadProductImages";
import { useImageUploadEnabled } from "@/hooks/useImageUploadEnabled";
import { useFormatCurrency } from "@/components/providers/TenantProvider";
import { useToast } from "@/hooks/use-toast";
import { randomProductSku } from "@/lib/products/catalog";
import { Dices, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";

const MAX_GALLERY_IMAGES = DEFAULT_MAX_GALLERY_IMAGES;

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

export type ProductVariantsPanelProps = {
  productId: string;
  productName?: string;
};

export function ProductVariantsPanel({ productId, productName }: ProductVariantsPanelProps) {
  const money = useFormatCurrency();
  const { configured: imageUploadEnabled } = useImageUploadEnabled();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [variantFormOpen, setVariantFormOpen] = useState(false);
  const [editVariantId, setEditVariantId] = useState<string | null>(null);
  const [variantForm, setVariantForm] = useState<VariantForm>(defaultVariantForm);
  const [variantError, setVariantError] = useState("");
  const [variantImageUploading, setVariantImageUploading] = useState(false);
  const [variantPendingUploadCount, setVariantPendingUploadCount] = useState(0);
  const variantUploadsInFlight = useRef(0);

  const {
    data: variants = [],
    isLoading: variantsLoading,
    isError: isVariantsError,
    error: variantsError,
  } = useQuery({
    queryKey: ["variants", productId],
    queryFn: async () => {
      const res = await fetch(`/api/products/${productId}/variants`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? `Failed to load variants (${res.status})`);
      return (data.data ?? []) as Variant[];
    },
    enabled: !!productId,
  });

  const saveVariantMutation = useMutation({
    mutationFn: async () => {
      const url = editVariantId
        ? `/api/products/${productId}/variants/${editVariantId}`
        : `/api/products/${productId}/variants`;
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
      queryClient.invalidateQueries({ queryKey: ["variants", productId] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: editVariantId ? "Variant updated" : "Variant created" });
      setVariantFormOpen(false);
      setVariantForm(defaultVariantForm);
      setEditVariantId(null);
    },
    onError: (err: Error) => setVariantError(err.message),
  });

  const deleteVariantMutation = useMutation({
    mutationFn: async (variantId: string) => {
      const res = await fetch(`/api/products/${productId}/variants/${variantId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? `Delete variant failed (${res.status})`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["variants", productId] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Variant deleted" });
    },
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

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

  return (
    <div className="space-y-4">
      {productName && (
        <p className="text-sm text-muted-foreground">
          Variants for <span className="font-medium text-foreground">{productName}</span>
        </p>
      )}

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
          <p className="text-sm font-semibold">{editVariantId ? "Edit Variant" : "New Variant"}</p>
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
                  onClick={() => setVariantForm((f) => ({ ...f, sku: randomProductSku() }))}
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
              onClick={() => {
                setVariantFormOpen(false);
                setEditVariantId(null);
              }}
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
                <p className="text-xs text-muted-foreground mt-1">{money(v.retailPrice)} retail</p>
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
  );
}
