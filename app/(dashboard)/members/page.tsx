"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { Header } from "@/components/layout/Header";
import { DataTable } from "@/components/shared/DataTable";
import { ListPagination } from "@/components/shared/ListPagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { StatCard } from "@/components/shared/StatCard";
import {
  Plus,
  Pencil,
  Loader2,
  Users,
  Search,
  UserCheck,
  UserX,
  MoreHorizontal,
  ShoppingBag,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useConfirm } from "@/components/providers/confirm-provider";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { AuditTrail } from "@/components/shared/AuditTrail";
import { useTenant, useFormatCurrency, useFormatDate } from "@/components/providers/TenantProvider";

type MemberStatus = "active" | "inactive" | "suspended";

interface Member {
  _id: string;
  memberId: string;
  name: string;
  email?: string;
  phone: string;
  address?: string;
  discountPercent: number;
  status: MemberStatus;
  totalPurchases: number;
  totalSpent: number;
  joinedAt: string;
}

interface MemberOrder {
  _id: string;
  orderNumber: string;
  total: number;
  discountAmount: number;
  paymentMethod: string;
  status: string;
  createdAt: string;
}

interface MemberForm {
  name: string;
  email: string;
  phone: string;
  address: string;
  discountPercent: number;
  branchId: string;
}

const STATUS_CONFIG: Record<MemberStatus, { label: string; variant: "success" | "secondary" | "destructive" }> = {
  active: { label: "Active", variant: "success" },
  inactive: { label: "Inactive", variant: "secondary" },
  suspended: { label: "Suspended", variant: "destructive" },
};

export default function MembersPage() {
  const { data: session } = useSession();
  const { memberDefaultDiscountPercent } = useTenant();
  const money = useFormatCurrency();
  const dateFmt = useFormatDate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const confirm = useConfirm();

  const primaryBranchId = session?.user?.branchIds?.[0] ?? "";

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<MemberForm>({
    name: "",
    email: "",
    phone: "",
    address: "",
    discountPercent: memberDefaultDiscountPercent,
    branchId: primaryBranchId,
  });
  const [formError, setFormError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [historyMember, setHistoryMember] = useState<Member | null>(null);
  const [historyPage, setHistoryPage] = useState(1);

  const { data: result, isLoading, isError, error } = useQuery({
    queryKey: ["members", search, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: "10" });
      if (search) params.set("search", search);
      const res = await fetch(`/api/members?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? `Failed to load members (${res.status})`);
      return json as {
        data: Member[];
        meta?: { total: number; activeCount: number; inactiveCount: number };
      };
    },
  });

  const { data: historyResult, isLoading: historyLoading } = useQuery({
    queryKey: ["member-orders", historyMember?._id, historyPage],
    queryFn: async () => {
      const params = new URLSearchParams({
        memberId: historyMember!._id,
        page: String(historyPage),
        limit: "10",
      });
      const res = await fetch(`/api/orders?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? `Failed to load orders (${res.status})`);
      return json as {
        data: MemberOrder[];
        meta?: { total: number };
      };
    },
    enabled: !!historyMember,
  });

  const members: Member[] = result?.data ?? [];
  const total: number = result?.meta?.total ?? 0;
  const activeCount: number = result?.meta?.activeCount ?? 0;
  const inactiveCount: number = result?.meta?.inactiveCount ?? 0;
  const orders: MemberOrder[] = historyResult?.data ?? [];
  const ordersTotal: number = historyResult?.meta?.total ?? 0;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const url = editId ? `/api/members/${editId}` : "/api/members";
      const method = editId ? "PATCH" : "POST";
      const payload = editId
        ? { name: form.name, email: form.email, phone: form.phone, address: form.address, discountPercent: form.discountPercent }
        : form;
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      toast({ title: editId ? "Member updated" : "Member registered" });
      setOpen(false);
      resetForm();
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: MemberStatus }) => {
      const res = await fetch(`/api/members/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      queryClient.invalidateQueries({ queryKey: ["member-orders"] });
      toast({ title: "Member status updated" });
    },
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  function resetForm() {
    setForm({
      name: "",
      email: "",
      phone: "",
      address: "",
      discountPercent: memberDefaultDiscountPercent,
      branchId: primaryBranchId,
    });
    setEditId(null);
    setFormError("");
  }

  function openEdit(member: Member) {
    const dp = Number(member.discountPercent);
    setForm({
      name: member.name,
      email: member.email ?? "",
      phone: member.phone,
      address: member.address ?? "",
      discountPercent: Number.isFinite(dp) ? dp : memberDefaultDiscountPercent,
      branchId: primaryBranchId,
    });
    setEditId(member._id);
    setFormError("");
    setOpen(true);
  }

  function openHistory(member: Member) {
    setHistoryMember(member);
    setHistoryPage(1);
  }

  const canSubmitMember =
    form.name.trim().length >= 2 &&
    form.phone.trim().length >= 7 &&
    (!!editId || !!form.branchId.trim());

  const columns = [
    {
      key: "member",
      label: "Member",
      render: (m: Member) => (
        <div>
          <p className="font-medium">{m.name}</p>
          <p className="text-xs text-muted-foreground">{m.memberId}</p>
        </div>
      ),
    },
    {
      key: "contact",
      label: "Contact",
      render: (m: Member) => (
        <div className="text-sm">
          <p>{m.phone}</p>
          {m.email && <p className="text-muted-foreground text-xs">{m.email}</p>}
        </div>
      ),
    },
    {
      key: "discount",
      label: "Discount",
      render: (m: Member) => (
        <Badge variant="secondary">
          {(Number.isFinite(Number(m.discountPercent)) ? m.discountPercent : memberDefaultDiscountPercent)}% off
        </Badge>
      ),
    },
    {
      key: "purchases",
      label: "Purchases",
      render: (m: Member) => (
        <div className="text-sm">
          <p className="font-medium">{money(m.totalSpent ?? 0)}</p>
          <p className="text-xs text-muted-foreground">{(m.totalPurchases ?? 0)} orders</p>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (m: Member) => {
        const cfg =
          STATUS_CONFIG[m.status as MemberStatus] ?? {
            label: String(m.status ?? "Unknown"),
            variant: "secondary" as const,
          };
        return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
      },
    },
    {
      key: "joined",
      label: "Joined",
      render: (m: Member) => (
        <span className="text-sm text-muted-foreground">{dateFmt(m.joinedAt)}</span>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (m: Member) => (
        <div className="flex gap-1 justify-end">
          <Button
            variant="ghost"
            size="icon"
            title="Purchase History"
            onClick={() => openHistory(m)}
          >
            <ShoppingBag className="h-4 w-4" />
          </Button>
          <RoleGuard requiredPermissions={["manage:members"]}>
            <Button variant="ghost" size="icon" onClick={() => openEdit(m)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {m.status !== "active" && (
                  <DropdownMenuItem
                    onClick={() => statusMutation.mutate({ id: m._id, status: "active" })}
                  >
                    <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                    Set Active
                  </DropdownMenuItem>
                )}
                {m.status !== "inactive" && (
                  <DropdownMenuItem
                    onClick={async () => {
                      const ok = await confirm({
                        title: `Deactivate ${m.name}?`,
                        variant: "destructive",
                        confirmText: "Deactivate",
                      });
                      if (ok) statusMutation.mutate({ id: m._id, status: "inactive" });
                    }}
                  >
                    <XCircle className="h-4 w-4 mr-2 text-muted-foreground" />
                    Deactivate
                  </DropdownMenuItem>
                )}
                {m.status !== "suspended" && (
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={async () => {
                      const ok = await confirm({
                        title: `Suspend ${m.name}?`,
                        variant: "destructive",
                        confirmText: "Suspend",
                      });
                      if (ok) statusMutation.mutate({ id: m._id, status: "suspended" });
                    }}
                  >
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Suspend
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={async () => {
                    const ok = await confirm({
                      title: `Remove ${m.name}?`,
                      description: "This permanently removes the member. This cannot be undone.",
                      variant: "destructive",
                    });
                    if (!ok) return;
                    const res = await fetch(`/api/members/${m._id}`, { method: "DELETE" });
                    const json = await res.json();
                    if (!json.success) {
                      toast({ title: json.error ?? "Could not remove member", variant: "destructive" });
                      return;
                    }
                    queryClient.invalidateQueries({ queryKey: ["members"] });
                    queryClient.invalidateQueries({ queryKey: ["member-orders"] });
                    toast({ title: "Member removed" });
                  }}
                >
                  Remove Member
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </RoleGuard>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col">
      <Header title="Members" subtitle="Manage your member database" />
      <div className="flex-1 p-6 space-y-6">
        {isError && (
          <Alert variant="destructive">
            <AlertDescription>
              {error instanceof Error ? error.message : "Unable to load members."}
            </AlertDescription>
          </Alert>
        )}
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard title="Total Members" value={total} icon={Users} description="Registered" />
          <StatCard
            title="Active"
            value={activeCount}
            icon={UserCheck}
            description="Active members"
            iconClassName="bg-green-100"
          />
          <StatCard
            title="Inactive / Suspended"
            value={inactiveCount}
            icon={UserX}
            description="Inactive or suspended"
            iconClassName="bg-gray-100"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, phone, ID..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9"
            />
          </div>
          <RoleGuard requiredPermissions={["manage:members"]}>
            <Button onClick={() => { resetForm(); setOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Register Member
            </Button>
          </RoleGuard>
        </div>

        <DataTable
          columns={columns}
          data={members}
          loading={isLoading}
          keyExtractor={(m) => m._id}
          emptyMessage="No members found."
          page={page}
          totalPages={Math.ceil(total / 10)}
          onPageChange={setPage}
        />
      </div>

      {/* Register / Edit Dialog */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Member" : "Register New Member"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {formError && (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Full Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Juan dela Cruz"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone Number *</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+63 9xx xxx xxxx"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="member@email.com"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Address</Label>
                <Input
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder="Complete address"
                />
              </div>
              <div className="space-y-2">
                <Label>Discount % (default {memberDefaultDiscountPercent}% from application settings)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={form.discountPercent}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, discountPercent: parseInt(e.target.value) || 0 }))
                  }
                />
              </div>
            </div>
            {editId && (
              <RoleGuard allowedRoles={["ADMIN"]}>
                <AuditTrail targetId={editId} className="border-t pt-4" />
              </RoleGuard>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setFormError("");
                saveMutation.mutate();
              }}
              disabled={saveMutation.isPending || !canSubmitMember}
            >
              {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editId ? "Update" : "Register"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Purchase History Dialog */}
      <Dialog open={!!historyMember} onOpenChange={(o) => !o && setHistoryMember(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Purchase History — {historyMember?.name}</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <div className="flex gap-4 text-sm">
              <span className="text-muted-foreground">
                Total spent: <span className="font-semibold text-foreground">{money(historyMember?.totalSpent ?? 0)}</span>
              </span>
              <span className="text-muted-foreground">
                Orders: <span className="font-semibold text-foreground">{historyMember?.totalPurchases ?? 0}</span>
              </span>
              <span className="text-muted-foreground">
                Discount:{" "}
                <span className="font-semibold text-foreground">
                  {historyMember &&
                  Number.isFinite(Number(historyMember.discountPercent))
                    ? historyMember.discountPercent
                    : memberDefaultDiscountPercent}
                  %
                </span>
              </span>
            </div>

            {historyLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : orders.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No purchases yet.</p>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium">Order #</th>
                      <th className="text-left px-4 py-2 font-medium">Date</th>
                      <th className="text-right px-4 py-2 font-medium">Discount</th>
                      <th className="text-right px-4 py-2 font-medium">Total</th>
                      <th className="text-left px-4 py-2 font-medium">Payment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {orders.map((o) => (
                      <tr key={o._id} className="hover:bg-muted/50">
                        <td className="px-4 py-3 font-medium">{o.orderNumber}</td>
                        <td className="px-4 py-3 text-muted-foreground">{dateFmt(o.createdAt)}</td>
                        <td className="px-4 py-3 text-right text-green-600">
                          {(o.discountAmount ?? 0) > 0 ? `-${money(o.discountAmount ?? 0)}` : "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">{money(o.total ?? 0)}</td>
                        <td className="px-4 py-3 capitalize text-muted-foreground">{o.paymentMethod}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <ListPagination
              page={historyPage}
              totalPages={Math.ceil(ordersTotal / 10)}
              onPageChange={setHistoryPage}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoryMember(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
