"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import { DataTable } from "@/components/shared/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  CheckCircle2,
  XCircle,
  Trash2,
  Loader2,
  ExternalLink,
  Building2,
  Users,
  GitBranch,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

interface Tenant {
  _id: string;
  name: string;
  slug: string;
  email: string;
  status: "active" | "trial" | "suspended";
  userCount: number;
  branchCount: number;
  createdAt: string;
}

interface CreateForm {
  tenantName: string;
  tenantSlug: string;
  email: string;
  name: string;
  password: string;
}

const defaultCreate: CreateForm = {
  tenantName: "",
  tenantSlug: "",
  email: "",
  name: "",
  password: "",
};

function statusVariant(status: string): "success" | "secondary" | "destructive" {
  if (status === "active") return "success";
  if (status === "suspended") return "destructive";
  return "secondary";
}

function autoSlug(name: string) {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export default function TenantsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(defaultCreate);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (searchParams.get("action") === "new") {
      setCreateOpen(true);
      router.replace("/super-admin/tenants");
    }
  }, [searchParams, router]);

  const { data, isLoading } = useQuery({
    queryKey: ["sa-tenants", search, statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);
      params.set("page", String(page));
      params.set("limit", "20");
      const res = await fetch(`/api/super-admin/tenants?${params}`);
      const json = await res.json();
      return { tenants: (json.data ?? []) as Tenant[], meta: json.meta };
    },
  });

  const tenants = data?.tenants ?? [];
  const totalPages = data?.meta?.totalPages ?? 1;
  const totalCount = data?.meta?.total ?? 0;

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/super-admin/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sa-tenants"] });
      toast({ title: "Tenant created successfully" });
      setCreateOpen(false);
      setCreateForm(defaultCreate);
      setFormError("");
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/super-admin/tenants/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
    },
    onSuccess: (_d, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["sa-tenants"] });
      toast({ title: `Tenant marked as ${status}` });
    },
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/super-admin/tenants/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sa-tenants"] });
      toast({ title: "Tenant deleted" });
    },
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  const columns = [
    {
      key: "tenant",
      label: "Tenant",
      render: (t: Tenant) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
            <Building2 className="h-4 w-4 text-blue-600" />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{t.name}</p>
            <p className="text-xs text-muted-foreground font-mono">/{t.slug}</p>
          </div>
        </div>
      ),
    },
    {
      key: "email",
      label: "Owner Email",
      render: (t: Tenant) => (
        <span className="text-sm text-muted-foreground">{t.email}</span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (t: Tenant) => (
        <Badge variant={statusVariant(t.status)} className="capitalize">
          {t.status}
        </Badge>
      ),
    },
    {
      key: "stats",
      label: "Team",
      render: (t: Tenant) => (
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {t.userCount}
          </span>
          <span className="flex items-center gap-1">
            <GitBranch className="h-3.5 w-3.5" />
            {t.branchCount}
          </span>
        </div>
      ),
    },
    {
      key: "created",
      label: "Created",
      render: (t: Tenant) => (
        <span className="text-xs text-muted-foreground">
          {new Date(t.createdAt).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      className: "w-10",
      render: (t: Tenant) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/super-admin/tenants/${t._id}`}>
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href={`/${t.slug}/dashboard`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Dashboard
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {t.status !== "active" && (
              <DropdownMenuItem onClick={() => statusMutation.mutate({ id: t._id, status: "active" })}>
                <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                Activate
              </DropdownMenuItem>
            )}
            {t.status !== "suspended" && (
              <DropdownMenuItem onClick={() => statusMutation.mutate({ id: t._id, status: "suspended" })}>
                <XCircle className="h-4 w-4 mr-2 text-orange-500" />
                Suspend
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => deleteMutation.mutate(t._id)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-30 flex h-16 items-center border-b bg-background px-6">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold">Tenants</h1>
          <p className="text-sm text-muted-foreground">Manage all organizations on the platform</p>
        </div>
        <Button onClick={() => { setCreateForm(defaultCreate); setFormError(""); setCreateOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          New Tenant
        </Button>
      </header>

      <div className="flex-1 p-6 space-y-4">
        <Card>
          <CardContent className="p-4 space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="flex gap-2 flex-1 min-w-0">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, slug, or email…"
                    className="pl-9"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  />
                </div>
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-sm text-muted-foreground whitespace-nowrap">
                {totalCount} tenant{totalCount !== 1 ? "s" : ""}
              </p>
            </div>

            <DataTable
              columns={columns}
              data={tenants}
              loading={isLoading}
              keyExtractor={(t) => t._id}
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              emptyMessage="No tenants found."
            />
          </CardContent>
        </Card>
      </div>

      {/* Create Tenant Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Tenant</DialogTitle>
            <DialogDescription>
              This will provision a new organization with a head office branch and an owner account.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {formError && (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}

            {/* Organization */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Organization
              </p>
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={createForm.tenantName}
                  onChange={(e) => {
                    const name = e.target.value;
                    setCreateForm((f) => ({
                      ...f,
                      tenantName: name,
                      tenantSlug: f.tenantSlug || autoSlug(name),
                    }));
                  }}
                  placeholder="Acme Corp"
                />
              </div>
              <div className="space-y-2">
                <Label>Slug</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground select-none">
                    /
                  </span>
                  <Input
                    className="pl-5"
                    value={createForm.tenantSlug}
                    onChange={(e) => setCreateForm((f) => ({ ...f, tenantSlug: autoSlug(e.target.value) }))}
                    placeholder="acme-corp"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Dashboard URL: /{createForm.tenantSlug || "slug"}/dashboard
                </p>
              </div>
            </div>

            {/* Owner */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-1">
                Owner Account
              </p>
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input
                  value={createForm.name}
                  onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Jane Dela Cruz"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="jane@acme.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="Min. 8 characters"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={
                createMutation.isPending ||
                !createForm.tenantName ||
                !createForm.tenantSlug ||
                !createForm.email ||
                !createForm.name ||
                !createForm.password
              }
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Create Tenant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
