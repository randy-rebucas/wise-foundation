"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Plus, Pencil, Trash2, Loader2, Building2, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { RoleGuard } from "@/components/layout/RoleGuard";

interface Branch {
  _id: string;
  name: string;
  code: string;
  address: string;
  phone?: string;
  isHeadOffice: boolean;
  isActive: boolean;
  managerId?: { name: string; email: string };
}

interface BranchForm {
  name: string;
  code: string;
  address: string;
  phone: string;
  isHeadOffice: boolean;
}

const defaultForm: BranchForm = {
  name: "",
  code: "",
  address: "",
  phone: "",
  isHeadOffice: false,
};

async function fetchBranches(): Promise<Branch[]> {
  const res = await fetch("/api/branches");
  const data = await res.json();
  return data.data ?? [];
}

async function saveBranch(form: BranchForm, id?: string) {
  const url = id ? `/api/branches/${id}` : "/api/branches";
  const method = id ? "PATCH" : "POST";
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(form),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}

async function deleteBranch(id: string) {
  const res = await fetch(`/api/branches/${id}`, { method: "DELETE" });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
}

export default function BranchesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<BranchForm>(defaultForm);
  const [formError, setFormError] = useState("");

  const { data: branches = [], isLoading } = useQuery({
    queryKey: ["branches"],
    queryFn: fetchBranches,
  });

  const saveMutation = useMutation({
    mutationFn: () => saveBranch(form, editId ?? undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      toast({ title: editId ? "Branch updated" : "Branch created", variant: "default" });
      setOpen(false);
      setForm(defaultForm);
      setEditId(null);
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBranch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      toast({ title: "Branch deleted" });
    },
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  function openEdit(branch: Branch) {
    setForm({
      name: branch.name,
      code: branch.code,
      address: branch.address,
      phone: branch.phone ?? "",
      isHeadOffice: branch.isHeadOffice,
    });
    setEditId(branch._id);
    setFormError("");
    setOpen(true);
  }

  function openCreate() {
    setForm(defaultForm);
    setEditId(null);
    setFormError("");
    setOpen(true);
  }

  const columns = [
    {
      key: "name",
      label: "Branch",
      render: (b: Branch) => (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="font-medium">{b.name}</p>
            <p className="text-xs text-muted-foreground">{b.code}</p>
          </div>
        </div>
      ),
    },
    {
      key: "address",
      label: "Address",
      render: (b: Branch) => (
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="h-3 w-3" />
          {b.address}
        </div>
      ),
    },
    {
      key: "manager",
      label: "Manager",
      render: (b: Branch) => b.managerId?.name ?? <span className="text-muted-foreground">—</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (b: Branch) => (
        <div className="flex gap-2">
          {b.isHeadOffice && <Badge variant="secondary">Head Office</Badge>}
          <Badge variant={b.isActive ? "success" : "destructive"}>
            {b.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (b: Branch) => (
        <div className="flex gap-2 justify-end">
          <RoleGuard requiredPermissions={["manage:branches"]}>
            <Button variant="ghost" size="icon" onClick={() => openEdit(b)}>
              <Pencil className="h-4 w-4" />
            </Button>
            {!b.isHeadOffice && (
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive"
                onClick={() => deleteMutation.mutate(b._id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </RoleGuard>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col">
      <Header title="Branches" subtitle="Manage your organization branches" />
      <div className="flex-1 p-6 space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">{branches.length} branches</p>
          <RoleGuard requiredPermissions={["manage:branches"]}>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Add Branch
            </Button>
          </RoleGuard>
        </div>

        <DataTable
          columns={columns}
          data={branches}
          loading={isLoading}
          keyExtractor={(b) => b._id}
          emptyMessage="No branches found. Add your first branch."
        />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Branch" : "Create Branch"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {formError && (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Branch Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Main Branch"
                />
              </div>
              <div className="space-y-2">
                <Label>Branch Code</Label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="e.g. BR01"
                  maxLength={10}
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+63 xxx xxx xxxx"
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
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editId ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
