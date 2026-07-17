"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShoppingCart } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PurchaseOrderForm } from "@/components/purchase-orders/PurchaseOrderForm";
import { useToast } from "@/hooks/use-toast";

export default function EditPurchaseOrderPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const id = typeof params.id === "string" ? params.id : params.id?.[0] ?? "";

  if (!id) {
    return (
      <div>
        <Header title="Edit Purchase Order" />
        <div className="p-4 pb-8 sm:p-6 space-y-4">
          <p className="text-muted-foreground">Invalid purchase order link.</p>
          <Button variant="outline" size="sm" asChild>
            <Link href="/purchase-orders">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Purchase Orders
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header
        title="Edit Purchase Order"
        subtitle="Update a draft order before submission"
      />
      <div className="p-4 pb-8 sm:p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/purchase-orders/${id}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to PO
            </Link>
          </Button>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShoppingCart className="h-5 w-5" />
                Order details
              </CardTitle>
              <CardDescription>
                Only draft purchase orders can be edited. Organization cannot be changed after
                creation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PurchaseOrderForm
                key={id}
                mode="edit"
                poId={id}
                onCancel={() => router.push(`/purchase-orders/${id}`)}
                onSuccess={(result) => {
                  toast({
                    title: "Purchase order updated",
                    description: result?.poNumber
                      ? `${result.poNumber} saved.`
                      : "Changes saved.",
                  });
                  router.push(result?.id ? `/purchase-orders/${result.id}` : `/purchase-orders/${id}`);
                }}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
