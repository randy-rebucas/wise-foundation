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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { StatCard } from "@/components/shared/StatCard";
import { Plus, Pencil, Trash2, Loader2, Users, Search, UserCheck, UserX } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Member {
  _id: string;
  memberId: string;
  name: string;
  email?: string;
  phone: string;
  discountPercent: number;
  status: "active" | "inactive" | "suspended";
  totalPurchases: number;
  totalSpent: number;
  joinedAt: string;
}

interface MemberForm {
  name: string;
  email: string;
  phone: string;
  address: string;
  discountPercent: number;
  branchId: string;
}

export default function MembersPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const branchId = session?.user?.branchIds?.[0] ?? "";

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<MemberForm>({
    name: "",
    email: "",
    phone: "",
    address: "",
    discountPercent: 10,
    branchId,
  });
  const [formError, setFormError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data: result, isLoading } = useQuery({
    queryKey: ["members", search, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (search) params.set("search", search);
      const res = await fetch(`/api/members?${params}`);
      const data = await res.json();
      return data;
    },
  });

  const members: Member[] = result?.data ?? [];
  const total = result?.meta?.total ?? 0;
  const activeCount = members.filter((m) => m.status === "active").length;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const url = editId ? `/api/members/${editId}` : "/api/members";
      const method = editId ? "PATCH" : "POST";
      const payload = editId ? { ...form, branchId: undefined } : form;
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

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/members/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      toast({ title: "Member removed" });
    },
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
      address: "",
      discountPercent: member.discountPercent,
      branchId,
    });
    setEditId(member._id);
    setFormError("");
    setOpen(true);
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
      render: (m: Member) => (
        <Badge variant="secondary">{m.discountPercent}% off</Badge>
      ),
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
      render: (m: Member) => (
        <Badge
          variant={
            m.status === "active" ? "success" : m.status === "suspended" ? "destructive" : "secondary"
          }
        >
          {m.status}
        </Badge>
      ),
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
        <div className="flex gap-2 justify-end">
          <RoleGuard requiredPermissions={["manage:members"]}>
            <Button variant="ghost" size="icon" onClick={() => openEdit(m)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive"
              onClick={() => deleteMutation.mutate(m._id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
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
            title="Inactive"
            value={total - activeCount}
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
    </div>
  );
}
