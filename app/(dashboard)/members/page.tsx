"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { Header } from "@/components/layout/Header";
import { DataTable } from "@/components/shared/DataTable";
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
import { RoleGuard } from "@/components/layout/RoleGuard";
import { formatCurrency, formatDate } from "@/lib/utils";

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
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const branchId = session?.user?.branchIds?.[0] ?? "";

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<MemberForm>({
    name: "", email: "", phone: "", address: "", discountPercent: 10, branchId,
  });
  const [formError, setFormError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [historyMember, setHistoryMember] = useState<Member | null>(null);
  const [historyPage, setHistoryPage] = useState(1);

  const { data: result, isLoading } = useQuery({
    queryKey: ["members", search, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (search) params.set("search", search);
      const res = await fetch(`/api/members?${params}`);
      return res.json();
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
      return res.json();
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
      toast({ title: "Member status updated" });
    },
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  function resetForm() {
    setForm({ name: "", email: "", phone: "", address: "", discountPercent: 10, branchId });
    setEditId(null);
    setFormError("");
  }

  function openEdit(member: Member) {
    setForm({
      name: member.name,
      email: member.email ?? "",
      phone: member.phone,
      address: member.address ?? "",
      discountPercent: member.discountPercent,
      branchId,
    });
    setEditId(member._id);
    setFormError("");
    setOpen(true);
  }

  function openHistory(member: Member) {
    setHistoryMember(member);
    setHistoryPage(1);
  }

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
      render: (m: Member) => <Badge variant="secondary">{m.discountPercent}% off</Badge>,
    },
    {
      key: "purchases",
      label: "Purchases",
      render: (m: Member) => (
        <div className="text-sm">
          <p className="font-medium">{formatCurrency(m.totalSpent)}</p>
          <p className="text-xs text-muted-foreground">{m.totalPurchases} orders</p>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (m: Member) => {
        const cfg = STATUS_CONFIG[m.status];
        return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
      },
    },
    {
      key: "joined",
      label: "Joined",
      render: (m: Member) => (
        <span className="text-sm text-muted-foreground">{formatDate(m.joinedAt)}</span>
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
                    onClick={() => statusMutation.mutate({ id: m._id, status: "inactive" })}
                  >
                    <XCircle className="h-4 w-4 mr-2 text-muted-foreground" />
                    Deactivate
                  </DropdownMenuItem>
                )}
                {m.status !== "suspended" && (
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => statusMutation.mutate({ id: m._id, status: "suspended" })}
                  >
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Suspend
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={async () => {
                    await fetch(`/api/members/${m._id}`, { method: "DELETE" });
                    queryClient.invalidateQueries({ queryKey: ["members"] });
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
          totalPages={Math.ceil(total / 20)}
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
                <Label>Discount % (default 10%)</Label>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
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
                Total spent: <span className="font-semibold text-foreground">{formatCurrency(historyMember?.totalSpent ?? 0)}</span>
              </span>
              <span className="text-muted-foreground">
                Orders: <span className="font-semibold text-foreground">{historyMember?.totalPurchases ?? 0}</span>
              </span>
              <span className="text-muted-foreground">
                Discount: <span className="font-semibold text-foreground">{historyMember?.discountPercent}%</span>
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
                        <td className="px-4 py-3 text-muted-foreground">{formatDate(o.createdAt)}</td>
                        <td className="px-4 py-3 text-right text-green-600">
                          {o.discountAmount > 0 ? `-${formatCurrency(o.discountAmount)}` : "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">{formatCurrency(o.total)}</td>
                        <td className="px-4 py-3 capitalize text-muted-foreground">{o.paymentMethod}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {ordersTotal > 10 && (
              <div className="flex justify-between items-center text-sm pt-1">
                <span className="text-muted-foreground">
                  Page {historyPage} of {Math.ceil(ordersTotal / 10)}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setHistoryPage((p) => p - 1)}
                    disabled={historyPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setHistoryPage((p) => p + 1)}
                    disabled={historyPage >= Math.ceil(ordersTotal / 10)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
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
