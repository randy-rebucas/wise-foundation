"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { DataTable } from "@/components/shared/DataTable";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Eye } from "lucide-react";
import { useFormatDateTime } from "@/components/providers/TenantProvider";

const ACTIONS = [
  "user.created",
  "user.updated",
  "user.role_changed",
  "user.deleted",
  "user.locked",
  "branch.updated",
  "branch.deleted",
  "organization.created",
  "organization.updated",
  "organization.deleted",
  "member.status_changed",
  "member.deleted",
  "commission.paid",
  "commission.cancelled",
  "settings.updated",
  "order.refunded",
  "db.restored",
  "db.transferred",
] as const;

interface AuditLogRow {
  _id: string;
  action: string;
  performedByName?: string | null;
  performedBy: string;
  targetId?: string | null;
  targetType?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export default function AuditLogsPage() {
  const dateTime = useFormatDateTime();
  const [action, setAction] = useState<string>("all");
  const [performedBy, setPerformedBy] = useState("");
  const [page, setPage] = useState(1);
  const [detailLog, setDetailLog] = useState<AuditLogRow | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", action, performedBy, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (action !== "all") params.set("action", action);
      if (performedBy) params.set("performedBy", performedBy);
      const res = await fetch(`/api/audit-logs?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to load audit logs");
      return json as { data: AuditLogRow[]; meta: { page: number; pages: number; total: number } };
    },
  });

  const logs = data?.data ?? [];

  const columns = [
    {
      key: "createdAt",
      label: "When",
      render: (r: AuditLogRow) => dateTime(r.createdAt),
    },
    {
      key: "action",
      label: "Action",
      render: (r: AuditLogRow) => <Badge variant="outline">{r.action}</Badge>,
    },
    {
      key: "actor",
      label: "Performed By",
      render: (r: AuditLogRow) => r.performedByName ?? r.performedBy,
    },
    {
      key: "target",
      label: "Target",
      render: (r: AuditLogRow) =>
        r.targetType ? `${r.targetType}${r.targetId ? ` (${r.targetId})` : ""}` : "—",
    },
    {
      key: "metadata",
      label: "Details",
      render: (r: AuditLogRow) =>
        r.metadata ? (
          <span className="text-xs text-muted-foreground font-mono truncate max-w-[280px] block">
            {Object.entries(r.metadata)
              .map(([k, v]) => `${k}: ${String(v)}`)
              .join(", ")}
          </span>
        ) : (
          "—"
        ),
    },
    {
      key: "view",
      label: "",
      render: (r: AuditLogRow) => (
        <Button
          variant="ghost"
          size="icon"
          title="View full details"
          aria-label="View full details"
          onClick={() => setDetailLog(r)}
        >
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col">
      <Header title="Audit Log" subtitle="Track sensitive actions across the platform" />
      <div className="flex-1 p-6 space-y-5">
        <div className="flex flex-wrap gap-3">
          <Select
            value={action}
            onValueChange={(v) => {
              setAction(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-56">
              <SelectValue placeholder="All actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              {ACTIONS.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Filter by performed-by user ID"
            value={performedBy}
            onChange={(e) => {
              setPerformedBy(e.target.value);
              setPage(1);
            }}
            className="w-64"
          />
        </div>
        <DataTable
          columns={columns}
          data={logs}
          loading={isLoading}
          keyExtractor={(r) => r._id}
          page={page}
          totalPages={data?.meta.pages ?? 1}
          onPageChange={setPage}
          emptyMessage="No audit log entries found."
        />
      </div>

      <Dialog open={!!detailLog} onOpenChange={(open) => !open && setDetailLog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Audit log entry</DialogTitle>
            <DialogDescription>Full details for this recorded action.</DialogDescription>
          </DialogHeader>
          {detailLog && (
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">When</dt>
                <dd>{dateTime(detailLog.createdAt)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Action</dt>
                <dd>
                  <Badge variant="outline">{detailLog.action}</Badge>
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Performed By</dt>
                <dd className="text-right">
                  {detailLog.performedByName ?? "—"}
                  <div className="font-mono text-xs text-muted-foreground">{detailLog.performedBy}</div>
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Target Type</dt>
                <dd>{detailLog.targetType ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Target ID</dt>
                <dd className="font-mono text-xs">{detailLog.targetId ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground mb-1">Metadata</dt>
                <dd>
                  <pre className="rounded-md border bg-muted/50 p-3 text-xs whitespace-pre-wrap break-all">
                    {detailLog.metadata ? JSON.stringify(detailLog.metadata, null, 2) : "—"}
                  </pre>
                </dd>
              </div>
            </dl>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
