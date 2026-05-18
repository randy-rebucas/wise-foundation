"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PurchaseOrderForm } from "@/components/purchase-orders/PurchaseOrderForm";
import { useToast } from "@/hooks/use-toast";

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const { toast } = useToast();

  return (
    <div className="flex flex-col">
      <Header
        title="New Purchase Order"
        subtitle="Create a draft order for a distributor, franchise, or partner"
      />
      <div className="flex-1 p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/purchase-orders">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Purchase Orders
            </Link>
          </Button>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShoppingBag className="h-5 w-5" />
                Order details
              </CardTitle>
              <CardDescription>
                Add line items from your product catalog. The order is saved as a draft until you
                submit it from the purchase orders list or detail page.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PurchaseOrderForm
                mode="create"
                onCancel={() => router.push("/purchase-orders")}
                onSuccess={(result) => {
                  toast({
                    title: "Purchase order created",
                    description: result?.poNumber
                      ? `${result.poNumber} saved as draft.`
                      : "Saved as draft.",
                  });
                  if (result?.id) {
                    router.push(`/purchase-orders/${result.id}`);
                  } else {
                    router.push("/purchase-orders");
                  }
                }}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
