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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, MoreHorizontal, Pencil, Trash2, Loader2, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type OrganizationType = "distributor" | "franchise" | "partner" | "headquarters";

interface OrgSettings {
  canSellRetail: boolean;
  canDistribute: boolean;
  hasInventory: boolean;
  commissionEnabled: boolean;
  canSubmitOrders: boolean;
}

interface Organization {
  _id: string;
  name: string;
  type: OrganizationType;
  parentOrganizationId?: { _id: string; name: string; type: OrganizationType } | null;
  settings: OrgSettings;
  commissionRate: number;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
}

interface OrgForm {
  name: string;
  type: OrganizationType | "";
  parentOrganizationId: string;
  settings: OrgSettings;
  commissionRate: number;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
}

const TYPE_OPTIONS: { value: OrganizationType; label: string }[] = [
  { value: "headquarters", label: "Headquarters" },
  { value: "distributor", label: "Distributor" },
  { value: "franchise", label: "Franchise" },
  { value: "partner", label: "Partner" },
];

const TYPE_VARIANT: Record<OrganizationType, "default" | "secondary" | "outline"> = {
  headquarters: "default",
  distributor: "default",
  franchise: "secondary",
  partner: "outline",
};

const defaultSettings: OrgSettings = {
  canSellRetail: false,
  canDistribute: false,
  hasInventory: true,
  commissionEnabled: false,
  canSubmitOrders: false,
};

const TYPE_DEFAULT_SETTINGS: Record<OrganizationType, OrgSettings> = {
  headquarters: { canSellRetail: false, canDistribute: true,  hasInventory: true,  commissionEnabled: false, canSubmitOrders: false },
  distributor:  { canSellRetail: false, canDistribute: true,  hasInventory: true,  commissionEnabled: false, canSubmitOrders: true },
  franchise:    { canSellRetail: true,  canDistribute: false, hasInventory: true,  commissionEnabled: false, canSubmitOrders: true },
  partner:      { canSellRetail: true,  canDistribute: false, hasInventory: false, commissionEnabled: true,  canSubmitOrders: true },
};

const defaultForm: OrgForm = {
  name: "",
  type: "",
  parentOrganizationId: "",
  settings: defaultSettings,
  commissionRate: 10,
  contactPerson: "",
  email: "",
  phone: "",
  address: "",
  notes: "",
};

export default function OrganizationsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<OrgForm>(defaultForm);
  const [editForm, setEditForm] = useState<OrgForm>(defaultForm);
  const [formError, setFormError] = useState("");

  const { data: organizations = [], isLoading } = useQuery({
    queryKey: ["organizations", typeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (typeFilter !== "all") params.set("type", typeFilter);
      const res = await fetch(`/api/organizations?${params}`);
      const data = await res.json();
      return (data.data ?? []) as Organization[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...createForm,
        parentOrganizationId: createForm.parentOrganizationId || null,
      };
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      toast({ title: "Organization created successfully" });
      setCreateOpen(false);
      setCreateForm(defaultForm);
      setFormError("");
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...editForm,
        parentOrganizationId: editForm.parentOrganizationId || null,
      };
      const res = await fetch(`/api/organizations/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      toast({ title: "Organization updated successfully" });
      setEditOpen(false);
      setEditId(null);
      setFormError("");
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/organizations/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      toast({ title: "Organization removed" });
    },
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  const setParentMutation = useMutation({
    mutationFn: async ({ childId, parentId }: { childId: string; parentId: string }) => {
      const res = await fetch(`/api/organizations/${childId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentOrganizationId: parentId }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      toast({ title: "Parent organization set to HQ" });
    },
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  const hqOrg = organizations.find((o) => o.type === "headquarters") ?? null;

  function openEdit(org: Organization) {
    setEditId(org._id);
    setEditForm({
      name: org.name,
      type: org.type,
      parentOrganizationId: org.parentOrganizationId?._id ?? "",
      settings: org.settings ?? defaultSettings,
      commissionRate: org.commissionRate ?? 10,
      contactPerson: org.contactPerson ?? "",
      email: org.email ?? "",
      phone: org.phone ?? "",
      address: org.address ?? "",
      notes: org.notes ?? "",
    });
    setFormError("");
    setEditOpen(true);
  }

  const columns = [
    {
      key: "name",
      label: "Organization",
      render: (org: Organization) => (
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Building2 className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-medium text-sm">{org.name}</p>
            {org.parentOrganizationId && (
              <p className="text-xs text-muted-foreground">
                Under: {org.parentOrganizationId.name}
              </p>
            )}
            {!org.parentOrganizationId && org.contactPerson && (
              <p className="text-xs text-muted-foreground">{org.contactPerson}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "type",
      label: "Type",
      render: (org: Organization) => (
        <Badge variant={TYPE_VARIANT[org.type]}>
          {org.type.charAt(0).toUpperCase() + org.type.slice(1)}
        </Badge>
      ),
    },
    {
      key: "settings",
      label: "Capabilities",
      render: (org: Organization) => (
        <div className="flex flex-wrap gap-1">
          {org.settings?.canSellRetail && (
            <Badge variant="outline" className="text-xs">Retail</Badge>
          )}
          {org.settings?.canDistribute && (
            <Badge variant="outline" className="text-xs">Distribute</Badge>
          )}
          {org.settings?.hasInventory && (
            <Badge variant="outline" className="text-xs">Inventory</Badge>
          )}
          {org.settings?.commissionEnabled && (
            <Badge variant="outline" className="text-xs">Commission</Badge>
          )}
          {!org.settings?.canSellRetail && !org.settings?.canDistribute &&
           !org.settings?.hasInventory && !org.settings?.commissionEnabled && (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>
      ),
    },
    {
      key: "contact",
      label: "Contact",
      render: (org: Organization) => (
        <div className="text-sm text-muted-foreground space-y-0.5">
          {org.email && <p>{org.email}</p>}
          {org.phone && <p>{org.phone}</p>}
          {!org.email && !org.phone && <span>—</span>}
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (org: Organization) => (
        <Badge variant={org.isActive ? "success" : "destructive"}>
          {org.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "",
      className: "w-12",
      render: (org: Organization) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openEdit(org)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            {hqOrg && org.type !== "headquarters" && org.parentOrganizationId?._id !== hqOrg._id && (
              <DropdownMenuItem
                onClick={() => setParentMutation.mutate({ childId: org._id, parentId: hqOrg._id })}
              >
                <Building2 className="h-4 w-4 mr-2" />
                Set HQ as Parent
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => deleteMutation.mutate(org._id)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="flex flex-col">
      <Header
        title="Organizations"
        subtitle="Manage distributors, franchises, and partners"
      />
      <div className="flex-1 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {TYPE_OPTIONS.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={() => {
              setCreateForm(defaultForm);
              setFormError("");
              setCreateOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Organization
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">
          {organizations.length} organization{organizations.length !== 1 ? "s" : ""}
        </p>

        <DataTable
          columns={columns}
          data={organizations}
          loading={isLoading}
          keyExtractor={(org) => org._id}
          emptyMessage="No organizations found."
        />
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Organization</DialogTitle>
          </DialogHeader>
          <OrgFormFields
            form={createForm}
            setForm={setCreateForm}
            formError={formError}
            organizations={organizations}
            editingId={null}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || !createForm.name || !createForm.type}
            >
              {createMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Create Organization
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Organization</DialogTitle>
          </DialogHeader>
          <OrgFormFields
            form={editForm}
            setForm={setEditForm}
            formError={formError}
            organizations={organizations}
            editingId={editId}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending || !editForm.name || !editForm.type}
            >
              {updateMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SettingCheckbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-input accent-primary"
      />
      <span className="text-sm">{label}</span>
    </label>
  );
}

function OrgFormFields({
  form,
  setForm,
  formError,
  organizations,
  editingId,
}: {
  form: OrgForm;
  setForm: (f: OrgForm) => void;
  formError: string;
  organizations: Organization[];
  editingId: string | null;
}) {
  const parentOptions = organizations.filter((o) => o._id !== editingId);

  function setSetting(key: keyof OrgForm["settings"], value: boolean) {
    setForm({ ...form, settings: { ...form.settings, [key]: value } });
  }

  return (
    <div className="space-y-4 py-2">
      {formError && (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2 col-span-2">
          <Label>Organization Name *</Label>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Metro Distributors Inc."
          />
        </div>

        <div className="space-y-2 col-span-2 sm:col-span-1">
          <Label>Type *</Label>
          <Select
            value={form.type}
            onValueChange={(v) => {
              const type = v as OrganizationType;
              setForm({
                ...form,
                type,
                settings: TYPE_DEFAULT_SETTINGS[type],
                parentOrganizationId: type === "headquarters" ? "" : form.parentOrganizationId,
              });
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="headquarters">Headquarters</SelectItem>
              <SelectItem value="distributor">Distributor</SelectItem>
              <SelectItem value="franchise">Franchise</SelectItem>
              <SelectItem value="partner">Partner</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 col-span-2 sm:col-span-1">
          <Label>Parent Organization</Label>
          <Select
            value={form.parentOrganizationId || "none"}
            onValueChange={(v) =>
              setForm({ ...form, parentOrganizationId: v === "none" ? "" : v })
            }
            disabled={form.type === "headquarters"}
          >
            <SelectTrigger>
              <SelectValue placeholder={form.type === "headquarters" ? "N/A — HQ has no parent" : "None (top-level)"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None (top-level)</SelectItem>
              {parentOptions.filter((o) => o.type !== "headquarters").map((o) => (
                <SelectItem key={o._id} value={o._id}>
                  {o.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.type === "headquarters" && (
            <p className="text-xs text-muted-foreground">Headquarters cannot have a parent organization.</p>
          )}
        </div>

        <div className="space-y-2 col-span-2">
          <Label>Capabilities</Label>
          <div className="grid grid-cols-2 gap-2 p-3 border rounded-md bg-muted/30">
            <SettingCheckbox
              label="Can Sell Retail"
              checked={form.settings.canSellRetail}
              onChange={(v) => setSetting("canSellRetail", v)}
            />
            <SettingCheckbox
              label="Can Distribute"
              checked={form.settings.canDistribute}
              onChange={(v) => setSetting("canDistribute", v)}
            />
            <SettingCheckbox
              label="Has Inventory"
              checked={form.settings.hasInventory}
              onChange={(v) => setSetting("hasInventory", v)}
            />
            <SettingCheckbox
              label="Commission Enabled"
              checked={form.settings.commissionEnabled}
              onChange={(v) => setSetting("commissionEnabled", v)}
            />
            <SettingCheckbox
              label="Can Submit Orders"
              checked={form.settings.canSubmitOrders}
              onChange={(v) => setSetting("canSubmitOrders", v)}
            />
          </div>
        </div>

        {form.settings.commissionEnabled && (
          <div className="space-y-2 col-span-2 sm:col-span-1">
            <Label>Commission Rate (%)</Label>
            <Input
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={form.commissionRate}
              onChange={(e) =>
                setForm({ ...form, commissionRate: parseFloat(e.target.value) || 0 })
              }
            />
          </div>
        )}

        <div className="space-y-2 col-span-2 sm:col-span-1">
          <Label>Contact Person</Label>
          <Input
            value={form.contactPerson}
            onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
            placeholder="Full name"
          />
        </div>
        <div className="space-y-2 col-span-2 sm:col-span-1">
          <Label>Phone</Label>
          <Input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="+63 9xx xxx xxxx"
          />
        </div>
        <div className="space-y-2 col-span-2">
          <Label>Email</Label>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="org@example.com"
          />
        </div>
        <div className="space-y-2 col-span-2">
          <Label>Address</Label>
          <Input
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="Street, City, Province"
          />
        </div>
        <div className="space-y-2 col-span-2">
          <Label>Notes</Label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Additional notes..."
            rows={3}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
          />
        </div>
      </div>
    </div>
  );
}
