"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DataTable } from "@/components/shared/DataTable";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import Link from "next/link";

type UserRole =
  | "SUPER_ADMIN"
  | "TENANT_OWNER"
  | "BRANCH_MANAGER"
  | "STAFF"
  | "INVENTORY_MANAGER"
  | "MEMBER";

interface TenantRef {
  _id: string;
  name: string;
  slug: string;
}

interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  tenantId: TenantRef | null;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: "SUPER_ADMIN", label: "Super Admin" },
  { value: "TENANT_OWNER", label: "Tenant Owner" },
  { value: "BRANCH_MANAGER", label: "Branch Manager" },
  { value: "STAFF", label: "Staff" },
  { value: "INVENTORY_MANAGER", label: "Inventory Manager" },
  { value: "MEMBER", label: "Member" },
];

const ROLE_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  SUPER_ADMIN: "destructive",
  TENANT_OWNER: "default",
  BRANCH_MANAGER: "secondary",
  STAFF: "outline",
  INVENTORY_MANAGER: "secondary",
  MEMBER: "outline",
};

export default function AllUsersPage() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["sa-users", search, roleFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (roleFilter !== "all") params.set("role", roleFilter);
      params.set("page", String(page));
      params.set("limit", "25");
      const res = await fetch(`/api/super-admin/users?${params}`);
      const json = await res.json();
      return { users: (json.data ?? []) as User[], meta: json.meta };
    },
  });

  const users = data?.users ?? [];
  const totalPages = data?.meta?.totalPages ?? 1;

  const columns = [
    {
      key: "user",
      label: "User",
      render: (u: User) => {
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
      render: (u: User) => (
        <Badge variant={ROLE_VARIANT[u.role] ?? "outline"}>
          {u.role.replace(/_/g, " ")}
        </Badge>
      ),
    },
    {
      key: "tenant",
      label: "Tenant",
      render: (u: User) => {
        if (!u.tenantId) return <span className="text-muted-foreground text-sm">—</span>;
        return (
          <Link
            href={`/super-admin/tenants/${u.tenantId._id}`}
            className="text-sm text-primary hover:underline"
          >
            {u.tenantId.name}
          </Link>
        );
      },
    },
    {
      key: "status",
      label: "Status",
      render: (u: User) => (
        <Badge variant={u.isActive ? "success" : "secondary"}>
          {u.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "lastLogin",
      label: "Last Login",
      render: (u: User) => (
        <span className="text-xs text-muted-foreground">
          {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : "Never"}
        </span>
      ),
    },
    {
      key: "joined",
      label: "Joined",
      render: (u: User) => (
        <span className="text-xs text-muted-foreground">
          {new Date(u.createdAt).toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-30 flex h-16 items-center border-b bg-background px-6">
        <div>
          <h1 className="text-xl font-semibold">Users</h1>
          <p className="text-sm text-muted-foreground">All users across every tenant</p>
        </div>
      </header>

      <div className="flex-1 p-6 space-y-4">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              className="pl-9"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1); }}>
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

        <p className="text-sm text-muted-foreground">{data?.meta?.total ?? 0} users</p>

        <DataTable
          columns={columns}
          data={users}
          loading={isLoading}
          keyExtractor={(u) => u._id}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          emptyMessage="No users found."
        />
      </div>
    </div>
  );
}
