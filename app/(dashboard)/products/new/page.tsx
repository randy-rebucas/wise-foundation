"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Package } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductForm } from "@/components/products/ProductForm";
import { useToast } from "@/hooks/use-toast";

export default function NewProductPage() {
  const router = useRouter();
  const { toast } = useToast();

  return (
    <div>
      <Header title="New Product" subtitle="Add a product to your catalog" />
      <div className="p-4 pb-8 sm:p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/products">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Products
            </Link>
          </Button>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Package className="h-5 w-5" />
                Product details
              </CardTitle>
              <CardDescription>
                Set pricing, descriptions, and storefront visibility. You can add variants after
                saving.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProductForm
                mode="create"
                onCancel={() => router.push("/products")}
                onSuccess={(product) => {
                  toast({
                    title: "Product created",
                    description: `${product.name} (${product.sku})`,
                  });
                  router.push(`/products/${product._id}/edit`);
                }}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
