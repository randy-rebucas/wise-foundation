"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { DataTable } from "@/components/shared/DataTable";
import { StatCard } from "@/components/shared/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, ShoppingCart, AlertTriangle, CheckCircle, Trash2, Eye, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFormatCurrency, useFormatDateTime } from "@/components/providers/TenantProvider";

interface AbandonedCheckoutItem {
  productId: string;
  variantId?: string | null;
  name: string;
  variantName?: string;
  sku: string;
  price: number;
  quantity: number;
}

interface AbandonedCheckout {
  _id: string;
  email: string;
  fullName?: string;
  phone?: string;
  items: AbandonedCheckoutItem[];
  subtotal: number;
  discountAmount: number;
  shippingCost: number;
  total: number;
  paymentMethod?: string;
  status: "open" | "recovered";
  lastSeenAt: string;
  createdAt: string;
}

export default function AbandonedCheckoutsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const money = useFormatCurrency();
  const dateTimeFmt = useFormatDateTime();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "recovered">("open");
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState<AbandonedCheckout | null>(null);

  const { data: result, isLoading, isError, error } = useQuery({
    queryKey: ["abandoned-checkouts", search, statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: "10" });
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/abandoned-checkouts?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? `Failed to load abandoned checkouts (${res.status})`);
      return json as { data: AbandonedCheckout[]; meta?: { total: number; openCount: number } };
    },
  });

  const checkouts: AbandonedCheckout[] = result?.data ?? [];
  const total = result?.meta?.total ?? 0;
  const openCount = result?.meta?.openCount ?? 0;

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/abandoned-checkouts/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["abandoned-checkouts"] });
      toast({ title: "Abandoned checkout removed" });
    },
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  const columns = [
    {
      key: "customer",
      label: "Customer",
      render: (c: AbandonedCheckout) => (
        <div>
          <p className="font-medium text-sm">{c.fullName || "Guest"}</p>
          <p className="text-xs text-muted-foreground">{c.email}</p>
        </div>
      ),
    },
    {
      key: "items",
      label: "Items",
      render: (c: AbandonedCheckout) => (
        <span className="text-sm">{c.items.reduce((s, i) => s + i.quantity, 0)} item(s)</span>
      ),
    },
    {
      key: "total",
      label: "Total",
      render: (c: AbandonedCheckout) => <span className="font-medium">{money(c.total)}</span>,
    },
    {
      key: "lastSeenAt",
      label: "Last activity",
      render: (c: AbandonedCheckout) => (
        <span className="text-sm text-muted-foreground">{dateTimeFmt(c.lastSeenAt)}</span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (c: AbandonedCheckout) =>
        c.status === "recovered" ? (
          <Badge variant="success">Recovered</Badge>
        ) : (
          <Badge variant="secondary">Open</Badge>
        ),
    },
    {
      key: "actions",
      label: "",
      render: (c: AbandonedCheckout) => (
        <div className="flex items-center gap-1 justify-end">
          <Button variant="ghost" size="icon" onClick={() => setViewing(c)}>
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" asChild>
            <a href={`mailto:${c.email}`}>
              <Mail className="h-4 w-4" />
            </a>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive"
            onClick={() => {
              if (confirm("Remove this abandoned checkout record?")) deleteMutation.mutate(c._id);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col">
      <Header
        title="Abandoned Checkouts"
        subtitle="Customers who started checkout on the storefront but never completed payment"
      />
      <div className="flex-1 p-6 space-y-6">
        {isError && (
          <Alert variant="destructive">
            <AlertDescription>
              {error instanceof Error ? error.message : "Unable to load abandoned checkouts."}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <StatCard
            title="Open"
            value={openCount}
            icon={AlertTriangle}
            description="Not yet recovered"
            iconClassName="bg-amber-100"
          />
          <StatCard
            title="Total"
            value={total}
            icon={ShoppingCart}
            description={statusFilter === "all" ? "All records" : `Matching "${statusFilter}"`}
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, phone..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9"
            />
          </div>
          <Tabs
            value={statusFilter}
            onValueChange={(v) => { setStatusFilter(v as typeof statusFilter); setPage(1); }}
          >
            <TabsList>
              <TabsTrigger value="open">Open</TabsTrigger>
              <TabsTrigger value="recovered">Recovered</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <DataTable
          columns={columns}
          data={checkouts}
          loading={isLoading}
          keyExtractor={(c) => c._id}
          emptyMessage="No abandoned checkouts found."
          page={page}
          totalPages={Math.ceil(total / 10)}
          onPageChange={setPage}
        />
      </div>

      <Dialog open={!!viewing} onOpenChange={(v) => { if (!v) setViewing(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Abandoned Checkout</DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="space-y-4 py-2">
              <div className="text-sm">
                <p className="font-medium">{viewing.fullName || "Guest"}</p>
                <p className="text-muted-foreground">{viewing.email}</p>
                {viewing.phone && <p className="text-muted-foreground">{viewing.phone}</p>}
              </div>
              <div className="border rounded-lg divide-y">
                {viewing.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 text-sm">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.variantName ?? item.sku} · Qty {item.quantity}
                      </p>
                    </div>
                    <p className="font-medium">{money(item.price * item.quantity)}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{money(viewing.subtotal)}</span>
                </div>
                {viewing.discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-{money(viewing.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>{money(viewing.shippingCost)}</span>
                </div>
                <div className="flex justify-between font-bold pt-1 border-t">
                  <span>Total</span>
                  <span>{money(viewing.total)}</span>
                </div>
              </div>
              {viewing.status === "recovered" && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  Recovered into a completed order
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
