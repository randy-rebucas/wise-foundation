"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { Header } from "@/components/layout/Header";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/shared/StatCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MoreHorizontal, DollarSign, Clock, CheckCircle, TrendingUp } from "lucide-react";
import { useFormatCurrency, useFormatDateTime } from "@/components/providers/TenantProvider";
import { useToast } from "@/hooks/use-toast";
import { useConfirm } from "@/components/providers/confirm-provider";
import { canManageCommissionPayouts } from "@/lib/permissions/commissionAccess";
import { isPlatformAdmin } from "@/lib/permissions";

interface CommissionRecord {
  _id: string;
  organizationId: { _id: string; name: string; type: string; commissionRate: number } | null;
  orderId: { _id: string; orderNumber: string; total: number; createdAt: string } | null;
  saleAmount: number;
  rate: number;
  amount: number;
  status: "pending" | "paid" | "cancelled";
  paidAt?: string | null;
  paidBy?: { name: string } | null;
  notes?: string;
  createdAt: string;
}

const STATUS_BADGE: Record<string, "default" | "success" | "secondary" | "destructive" | "warning"> = {
  pending: "warning",
  paid: "success",
  cancelled: "destructive",
};

interface CommissionSummary {
  totalEarned: number;
  totalPaid: number;
  totalPending: number;
  count: number;
}

const emptySummary: CommissionSummary = {
  totalEarned: 0,
  totalPaid: 0,
  totalPending: 0,
  count: 0,
};

export default function CommissionsPage() {
  const money = useFormatCurrency();
  const dateTime = useFormatDateTime();
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const confirm = useConfirm();
  const userRole = session?.user?.role ?? "";
  const canPayout = canManageCommissionPayouts(userRole);
  const showOrgFilter = isPlatformAdmin(userRole);

  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [payOpen, setPayOpen] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [payNotes, setPayNotes] = useState("");
  const [orgFilter, setOrgFilter] = useState("");
  const [actionError, setActionError] = useState("");

  const orgId = userRole === "ORG_ADMIN" ? (session?.user?.organizationId ?? undefined) : orgFilter || undefined;

  const {
    data: summaryData,
    isLoading: isSummaryLoading,
    isError: isSummaryError,
    error: summaryError,
  } = useQuery({
    queryKey: ["commissions-summary", orgId],
    queryFn: async () => {
      const params = new URLSearchParams({ summary: "true" });
      if (orgId) params.set("organizationId", orgId);
      const res = await fetch(`/api/commissions?${params}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? `Failed to load commission summary (${res.status})`);
      return (data.data ?? emptySummary) as CommissionSummary;
    },
  });

  const {
    data: listResult,
    isLoading,
    isError: isListError,
    error: listError,
  } = useQuery({
    queryKey: ["commissions", orgId, statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (orgId) params.set("organizationId", orgId);
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/commissions?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? `Failed to load commissions (${res.status})`);
      return json as { data: CommissionRecord[]; meta?: { total: number } };
    },
  });

  const {
    data: organizations = [],
    isError: isOrgsError,
    error: orgsError,
  } = useQuery({
    queryKey: ["organizations-for-commissions"],
    queryFn: async () => {
      const res = await fetch("/api/organizations");
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? `Failed to load organizations (${res.status})`);
      return (json.data ?? []) as { _id: string; name: string; type: string }[];
    },
    enabled: showOrgFilter,
  });

  const actionMutation = useMutation({
    mutationFn: async ({ id, action, notes }: { id: string; action: "pay" | "cancel"; notes?: string }) => {
      const res = await fetch(`/api/commissions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, notes }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? `Update failed (${res.status})`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commissions"] });
      queryClient.invalidateQueries({ queryKey: ["commissions-summary"] });
      setPayOpen(false);
      setPayNotes("");
      setActionError("");
    },
    onError: (err: Error) => {
      setActionError(err.message);
      toast({ variant: "destructive", title: "Commission update failed", description: err.message });
    },
  });

  function openPayDialog(id: string) {
    setSelectedId(id);
    setPayNotes("");
    setActionError("");
    setPayOpen(true);
  }

  const records: CommissionRecord[] = listResult?.data ?? [];
  const total = listResult?.meta?.total ?? 0;
  const summary = summaryData ?? emptySummary;

  const columns = [
    {
      key: "org",
      label: "Organization",
      render: (r: CommissionRecord) => (
        <div>
          <p className="font-medium text-sm">{r.organizationId?.name ?? "—"}</p>
          <p className="text-xs text-muted-foreground capitalize">{r.organizationId?.type ?? ""}</p>
        </div>
      ),
    },
    {
      key: "order",
      label: "Order",
      render: (r: CommissionRecord) => (
        <div>
          <p className="font-mono text-sm">{r.orderId?.orderNumber ?? "—"}</p>
          <p className="text-xs text-muted-foreground">{r.orderId?.createdAt ? dateTime(r.orderId.createdAt) : ""}</p>
        </div>
      ),
    },
    {
      key: "sale",
      label: "Sale Amount",
      render: (r: CommissionRecord) => <span className="text-sm">{money(r.saleAmount)}</span>,
    },
    {
      key: "rate",
      label: "Rate",
      render: (r: CommissionRecord) => <span className="text-sm">{r.rate}%</span>,
    },
    {
      key: "amount",
      label: "Commission",
      render: (r: CommissionRecord) => (
        <span className="font-semibold text-sm">{money(r.amount)}</span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (r: CommissionRecord) => (
        <div className="flex items-center gap-2">
          <Badge variant={STATUS_BADGE[r.status] ?? "secondary"}>{r.status}</Badge>
          {r.status === "paid" && r.paidAt && (
            <span className="text-xs text-muted-foreground">{dateTime(r.paidAt)}</span>
          )}
        </div>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (r: CommissionRecord) =>
        canPayout && r.status === "pending" ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Commission actions">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openPayDialog(r._id)}>Mark as Paid</DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={async () => {
                  const ok = await confirm({
                    title: "Cancel this commission?",
                    description: "This cannot be undone if the order already settled.",
                    variant: "destructive",
                    confirmText: "Cancel Commission",
                  });
                  if (!ok) return;
                  setActionError("");
                  actionMutation.mutate({ id: r._id, action: "cancel" });
                }}
              >
                Cancel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null,
    },
  ];

  return (
    <div className="flex flex-col">
      <Header title="Commissions" subtitle="Track and manage partner earnings" />
      <div className="flex-1 p-6 space-y-6">
        {isSummaryError && (
          <Alert variant="destructive">
            <AlertDescription>
              {summaryError instanceof Error ? summaryError.message : "Unable to load commission summary."}
            </AlertDescription>
          </Alert>
        )}
        {isListError && (
          <Alert variant="destructive">
            <AlertDescription>
              {listError instanceof Error ? listError.message : "Unable to load commission records."}
            </AlertDescription>
          </Alert>
        )}
        {showOrgFilter && isOrgsError && (
          <Alert variant="destructive">
            <AlertDescription>
              {orgsError instanceof Error ? orgsError.message : "Unable to load organizations for filtering."}
            </AlertDescription>
          </Alert>
        )}

        {userRole === "ORG_ADMIN" ? (
          <p className="text-sm text-muted-foreground">
            Viewing commissions for your organization. Payouts are recorded by platform administrators
            after transfer.
          </p>
        ) : null}

        <div className="grid gap-4 md:grid-cols-4">
          <StatCard
            title="Total Earned"
            value={isSummaryLoading ? "…" : money(summary.totalEarned)}
            icon={TrendingUp}
            description="All active commissions"
            iconClassName="bg-blue-100"
          />
          <StatCard
            title="Pending Payout"
            value={isSummaryLoading ? "…" : money(summary.totalPending)}
            icon={Clock}
            description="Awaiting payment"
            iconClassName="bg-yellow-100"
          />
          <StatCard
            title="Total Paid"
            value={isSummaryLoading ? "…" : money(summary.totalPaid)}
            icon={CheckCircle}
            description="Paid out"
            iconClassName="bg-green-100"
          />
          <StatCard
            title="Records"
            value={isSummaryLoading ? "…" : summary.count}
            icon={DollarSign}
            description="Commission entries"
          />
        </div>

        <div className="flex items-center justify-between gap-4 flex-wrap">
          <Tabs value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="paid">Paid</TabsTrigger>
              <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
            </TabsList>
          </Tabs>

          {showOrgFilter && (organizations.length > 0 || !isOrgsError) && (
            <div className="w-56">
              <Select value={orgFilter || "all"} onValueChange={(v) => { setOrgFilter(v === "all" ? "" : v); setPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="All organizations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All organizations</SelectItem>
                  {organizations.map((o) => (
                    <SelectItem key={o._id} value={o._id}>
                      {o.name} ({o.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DataTable
          columns={columns}
          data={records}
          loading={isLoading}
          keyExtractor={(r) => r._id}
          emptyMessage="No commission records found."
          page={page}
          totalPages={Math.max(1, Math.ceil(total / 20))}
          onPageChange={setPage}
        />
      </div>

      {/* Mark Paid Dialog */}
      <Dialog
        open={payOpen}
        onOpenChange={(v) => {
          setPayOpen(v);
          if (!v) {
            setPayNotes("");
            setActionError("");
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Mark Commission as Paid</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Notes (optional)</Label>
              <Input
                placeholder="e.g. GCash transfer ref #123"
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
              />
            </div>
            {actionError && (
              <Alert variant="destructive">
                <AlertDescription>{actionError}</AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                setActionError("");
                actionMutation.mutate({ id: selectedId, action: "pay", notes: payNotes || undefined });
              }}
              disabled={actionMutation.isPending}
            >
              {actionMutation.isPending ? "Saving…" : "Confirm Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
