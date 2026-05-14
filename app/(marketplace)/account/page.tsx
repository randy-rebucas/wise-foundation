"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useFormatCurrency } from "@/components/providers/TenantProvider";
import { Loader2, Package } from "lucide-react";

type OrderRow = {
  _id: string;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string;
  paidAt: string | null;
  shipSummary: string;
};

export default function ShopAccountPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const money = useFormatCurrency();
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [ordersError, setOrdersError] = useState("");

  const loadOrders = useCallback(async () => {
    setOrdersError("");
    try {
      const res = await fetch("/api/account/orders");
      const json = await res.json();
      if (!res.ok || !json.success) {
        setOrdersError(json.error ?? "Could not load orders");
        setOrders([]);
        return;
      }
      setOrders(json.data as OrderRow[]);
    } catch {
      setOrdersError("Could not load orders");
      setOrders([]);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/account/login");
    } else if (status === "authenticated" && session?.user?.role !== "CUSTOMER") {
      router.replace("/dashboard");
    }
  }, [status, session, router]);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "CUSTOMER") {
      queueMicrotask(() => {
        void loadOrders();
      });
    }
  }, [status, session, loadOrders]);

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (session?.user?.role !== "CUSTOMER") {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-4">
      <Card>
        <CardHeader>
          <CardTitle>Your account</CardTitle>
          <CardDescription>Signed in as {session.user.email}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Hello, <span className="font-medium text-foreground">{session.user.name}</span>. Checkout while signed in
            links orders here.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/">Continue shopping</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/login">Team / distributor sign in</Link>
            </Button>
            <Button variant="secondary" onClick={() => void signOut({ callbackUrl: "/" })}>
              Sign out
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Package className="h-5 w-5" />
            Your orders
          </CardTitle>
          <CardDescription>Marketplace purchases on this account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {orders === null ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : ordersError ? (
            <p className="text-sm text-destructive">{ordersError}</p>
          ) : orders.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No orders yet.{" "}
              <Link href="/" className="text-primary font-medium hover:underline">
                Browse the shop
              </Link>
            </p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {orders.map((o) => (
                <li key={o._id} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <p className="font-mono text-sm font-semibold">{o.orderNumber}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{o.shipSummary}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(o.createdAt).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
                    <span className="font-semibold tabular-nums">{money(o.total)}</span>
                    <Badge variant="secondary" className="capitalize">
                      {o.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
