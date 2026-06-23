"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { History, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { useFormatDateTime } from "@/components/providers/TenantProvider";

interface AuditTrailRow {
  _id: string;
  action: string;
  performedByName?: string | null;
  performedBy: string;
  targetId?: string | null;
  targetType?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

interface AuditTrailProps {
  targetId: string;
  limit?: number;
  className?: string;
}

export function AuditTrail({ targetId, limit = 10, className }: AuditTrailProps) {
  const dateTime = useFormatDateTime();
  const [detailLog, setDetailLog] = useState<AuditTrailRow | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["audit-trail", targetId, limit],
    queryFn: async () => {
      const res = await fetch(`/api/audit-logs?targetId=${encodeURIComponent(targetId)}&limit=${limit}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to load history");
      return json.data as AuditTrailRow[];
    },
    enabled: !!targetId,
  });

  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-3">
        <History className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">History</h3>
      </div>

      {isLoading ? (
        <LoadingState size="sm" className="py-6" />
      ) : isError ? (
        <p className="text-sm text-muted-foreground py-2">Unable to load history.</p>
      ) : !data || data.length === 0 ? (
        <EmptyState title="No recorded activity" className="py-6" />
      ) : (
        <ul className="space-y-2">
          {data.map((row) => (
            <li
              key={row._id}
              className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Badge variant="outline" className="shrink-0">
                  {row.action}
                </Badge>
                <span className="truncate text-muted-foreground">
                  {row.performedByName ?? row.performedBy}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-muted-foreground">{dateTime(row.createdAt)}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  title="View full details"
                  aria-label="View full details"
                  onClick={() => setDetailLog(row)}
                >
                  <Eye className="h-3.5 w-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

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
