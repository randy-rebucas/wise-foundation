"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Layers, Package } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { ProductForm } from "@/components/products/ProductForm";
import { ProductVariantsPanel } from "@/components/products/ProductVariantsPanel";
import { productToFormValues } from "@/lib/products/productForm";
import type { ProductCategory } from "@/types";
import { useToast } from "@/hooks/use-toast";

type ProductDetail = {
  _id: string;
  name: string;
  sku: string;
  category: ProductCategory;
  retailPrice: number;
  isActive: boolean;
  marketplaceListed?: boolean;
  images: string[];
  shortDescription?: string;
  description?: string;
  seoTitle?: string;
  seoDescription?: string;
  barcode?: string;
  tags?: string[];
};

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const id = typeof params.id === "string" ? params.id : params.id?.[0] ?? "";

  const {
    data: product,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const res = await fetch(`/api/products/${id}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? `Failed to load product (${res.status})`);
      return data.data as ProductDetail;
    },
    enabled: !!id,
  });

  const initialValues = useMemo(
    () => (product ? productToFormValues(product) : undefined),
    [product]
  );

  if (!id) {
    return (
      <div>
        <Header title="Edit Product" />
        <div className="p-4 pb-8 sm:p-6 space-y-4">
          <p className="text-muted-foreground">Invalid product link.</p>
          <Button variant="outline" size="sm" asChild>
            <Link href="/products">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Products
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header title="Edit Product" subtitle="Update catalog details and variants" />
      <div className="p-4 pb-8 sm:p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/products">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Products
            </Link>
          </Button>

          {isLoading && <LoadingState />}

          {isError && (
            <ErrorState error={error} fallback="Unable to load product." onRetry={() => refetch()} />
          )}

          {product && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Package className="h-5 w-5" />
                    Product details
                  </CardTitle>
                  <CardDescription>
                    {product.name} · {product.sku}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ProductForm
                    key={id}
                    mode="edit"
                    productId={id}
                    initialValues={initialValues}
                    onCancel={() => router.push("/products")}
                    onSuccess={(saved) => {
                      toast({
                        title: "Product updated",
                        description: `${saved.name} (${saved.sku})`,
                      });
                      router.push("/products");
                    }}
                  />
                </CardContent>
              </Card>

              <Card id="variants">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Layers className="h-5 w-5" />
                    Variants
                  </CardTitle>
                  <CardDescription>
                    Optional sizes, scents, or SKUs that share this product listing.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ProductVariantsPanel productId={id} productName={product.name} />
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
