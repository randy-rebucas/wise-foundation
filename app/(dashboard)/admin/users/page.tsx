"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { DataTable } from "@/components/shared/DataTable";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, MoreHorizontal, Pencil, Trash2, Loader2, Search, UserCheck, UserX } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import { useSession } from "next-auth/react";

type UserRole = "ADMIN" | "BRANCH_MANAGER" | "STAFF" | "INVENTORY_MANAGER" | "MEMBER";

interface StaffUser {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  branchIds: string[];
  phone?: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

interface Branch {
  _id: string;
  name: string;
  code: string;
}

interface CreateForm {
  name: string;
  email: string;
  password: string;
  role: UserRole | "";
  branchIds: string[];
  phone: string;
}

interface EditForm {
  name: string;
  role: UserRole | "";
  branchIds: string[];
  phone: string;
  isActive: boolean;
}

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "ADMIN", label: "Admin" },
  { value: "BRANCH_MANAGER", label: "Branch Manager" },
  { value: "STAFF", label: "Staff" },
  { value: "INVENTORY_MANAGER", label: "Inventory Manager" },
  { value: "MEMBER", label: "Member" },
];

const ROLE_VARIANT: Record<UserRole, "default" | "secondary" | "outline" | "success" | "destructive"> = {
  ADMIN: "default",
  BRANCH_MANAGER: "secondary",
  STAFF: "outline",
  INVENTORY_MANAGER: "secondary",
  MEMBER: "outline",
};

const defaultCreate: CreateForm = {
  name: "",
  email: "",
  password: "",
  role: "",
  branchIds: [],
  phone: "",
};

const defaultEdit: EditForm = {
  name: "",
  role: "",
  branchIds: [],
  phone: "",
  isActive: true,
};

export default function UsersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<CreateForm>(defaultCreate);
  const [editForm, setEditForm] = useState<EditForm>(defaultEdit);
  const [formError, setFormError] = useState("");

  const { data: usersData, isLoading } = useQuery({
    queryKey: ["users", search, roleFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (roleFilter && roleFilter !== "all") params.set("role", roleFilter);
      const res = await fetch(`/api/users?${params}`);
      const data = await res.json();
      return (data.data ?? []) as StaffUser[];
    },
  });

  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      const res = await fetch("/api/branches");
      const data = await res.json();
      return (data.data ?? []) as Branch[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({ title: "User created successfully" });
      setCreateOpen(false);
      setCreateForm(defaultCreate);
      setFormError("");
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/users/${editId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({ title: "User updated successfully" });
      setEditOpen(false);
      setEditId(null);
      setFormError("");
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({ title: "User removed" });
    },
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({ title: "User status updated" });
    },
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  function openEdit(user: StaffUser) {
    setEditId(user._id);
    setEditForm({
      name: user.name,
      role: user.role,
      branchIds: user.branchIds,
      phone: user.phone ?? "",
      isActive: user.isActive,
    });
    setFormError("");
    setEditOpen(true);
  }

  function toggleBranch(branchId: string, form: CreateForm | EditForm, setForm: (f: CreateForm | EditForm) => void) {
    const ids = form.branchIds.includes(branchId)
      ? form.branchIds.filter((id) => id !== branchId)
      : [...form.branchIds, branchId];
    setForm({ ...form, branchIds: ids });
  }

  const users = usersData ?? [];

  const columns = [
    {
      key: "user",
      label: "User",
      render: (u: StaffUser) => {
        const initials = u.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">{u.name}</p>
              <p className="text-xs text-muted-foreground">{u.email}</p>
            </div>
          </div>
        );
      },
    },
    {
      key: "role",
      label: "Role",
      render: (u: StaffUser) => (
        <Badge variant={ROLE_VARIANT[u.role] ?? "outline"}>
          {u.role.replace(/_/g, " ")}
        </Badge>
      ),
    },
    {
      key: "branches",
      label: "Branches",
      render: (u: StaffUser) => (
        <span className="text-sm text-muted-foreground">
          {u.branchIds.length > 0 ? `${u.branchIds.length} branch${u.branchIds.length > 1 ? "es" : ""}` : "—"}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (u: StaffUser) => (
        <Badge variant={u.isActive ? "success" : "destructive"}>
          {u.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "",
      className: "w-12",
      render: (u: StaffUser) => {
        const isSelf = u._id === currentUserId;
        const isOwner = u.role === "ADMIN";

        if (isOwner) {
          return (
            <span className="text-xs text-muted-foreground italic px-2">Protected</span>
          );
        }

        return (
          <RoleGuard requiredPermissions={["manage:users"]}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openEdit(u)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                {!isSelf && (
                  <DropdownMenuItem
                    onClick={() => toggleActiveMutation.mutate({ id: u._id, isActive: !u.isActive })}
                  >
                    {u.isActive ? (
                      <><UserX className="h-4 w-4 mr-2" />Deactivate</>
                    ) : (
                      <><UserCheck className="h-4 w-4 mr-2" />Activate</>
                    )}
                  </DropdownMenuItem>
                )}
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => deleteMutation.mutate(u._id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove
                  </DropdownMenuItem>
                </>
              </DropdownMenuContent>
            </DropdownMenu>
          </RoleGuard>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col">
      <Header title="Users" subtitle="Manage team members and their roles" />
      <div className="flex-1 p-6 space-y-4">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          <div className="flex gap-2 flex-1">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                {ROLE_OPTIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <RoleGuard requiredPermissions={["manage:users"]}>
            <Button onClick={() => { setCreateForm(defaultCreate); setFormError(""); setCreateOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </RoleGuard>
        </div>

        <p className="text-sm text-muted-foreground">{users.length} users</p>

        <DataTable
          columns={columns}
          data={users}
          loading={isLoading}
          keyExtractor={(u) => u._id}
          emptyMessage="No users found."
        />
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {formError && (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Full Name</Label>
                <Input
                  value={createForm.name}
                  onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Jane Dela Cruz"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="jane@example.com"
                />
              </div>
              <div className="space-y-2 col-span-2 sm:col-span-1">
                <Label>Password</Label>
                <Input
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="Min. 8 characters"
                />
              </div>
              <div className="space-y-2 col-span-2 sm:col-span-1">
                <Label>Phone</Label>
                <Input
                  value={createForm.phone}
                  onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+63 9xx xxx xxxx"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Role</Label>
                <Select
                  value={createForm.role}
                  onValueChange={(v) => setCreateForm((f) => ({ ...f, role: v as UserRole }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {branches.length > 0 && (
                <div className="space-y-2 col-span-2">
                  <Label>Assign Branches</Label>
                  <div className="flex flex-wrap gap-2">
                    {branches.map((b) => (
                      <button
                        key={b._id}
                        type="button"
                        onClick={() => toggleBranch(b._id, createForm, (f) => setCreateForm(f as CreateForm))}
                        className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                          createForm.branchIds.includes(b._id)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background border-border hover:border-primary"
                        }`}
                      >
                        {b.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || !createForm.name || !createForm.email || !createForm.password || !createForm.role}
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {formError && (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2 sm:col-span-1">
                <Label>Full Name</Label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2 col-span-2 sm:col-span-1">
                <Label>Phone</Label>
                <Input
                  value={editForm.phone}
                  onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+63 9xx xxx xxxx"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Role</Label>
                <Select
                  value={editForm.role}
                  onValueChange={(v) => setEditForm((f) => ({ ...f, role: v as UserRole }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Changing the role will automatically update this user&apos;s permissions.
                </p>
              </div>
              {branches.length > 0 && (
                <div className="space-y-2 col-span-2">
                  <Label>Assigned Branches</Label>
                  <div className="flex flex-wrap gap-2">
                    {branches.map((b) => (
                      <button
                        key={b._id}
                        type="button"
                        onClick={() => toggleBranch(b._id, editForm, (f) => setEditForm(f as EditForm))}
                        className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                          editForm.branchIds.includes(b._id)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background border-border hover:border-primary"
                        }`}
                      >
                        {b.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending || !editForm.name || !editForm.role}
            >
              {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
