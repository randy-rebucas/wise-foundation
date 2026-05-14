"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useFormatCurrency } from "@/components/providers/TenantProvider";

function SuccessInner() {
  const search = useSearchParams();
  const money = useFormatCurrency();
  const orderNumber = search.get("orderNumber") ?? "";
  const totalRaw = search.get("total");
  const total = totalRaw ? Number(totalRaw) : NaN;

  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader className="text-center space-y-2">
        <div className="flex justify-center">
          <div className="rounded-full bg-primary/10 p-3">
            <CheckCircle className="h-10 w-10 text-primary" />
          </div>
        </div>
        <CardTitle className="text-2xl">Thank you for your order</CardTitle>
        <CardDescription>
          {orderNumber ? (
            <>
              Order <span className="font-mono font-medium text-foreground">{orderNumber}</span>
              {Number.isFinite(total) ? <> · Total {money(total)}</> : null}
            </>
          ) : (
            "Your order was placed successfully."
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Button asChild>
          <Link href="/">Continue shopping</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/account/login">Shop account sign in</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export default function MarketplaceCheckoutSuccessPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-muted-foreground">Loading…</div>}>
      <SuccessInner />
    </Suspense>
  );
}
