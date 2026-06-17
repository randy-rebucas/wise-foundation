"use client";

import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Database,
  Download,
  Eye,
  Loader2,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  Upload,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { RoleGuard } from "@/components/layout/RoleGuard";

interface BackupFile {
  filename: string;
  size: number;
  createdAt: string;
}

interface BackupPreviewCollection {
  name: string;
  count: number;
  indexCount: number;
  sample: unknown;
}

interface BackupPreview {
  filename: string;
  createdAt: string | null;
  collections: BackupPreviewCollection[];
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function fetchBackups(): Promise<BackupFile[]> {
  const res = await fetch("/api/admin/backup");
  const json = await res.json();
  if (!json.success) throw new Error(json.error ?? "Failed to fetch backups");
  return json.data;
}

async function createBackup(label: string): Promise<BackupFile> {
  const res = await fetch("/api/admin/backup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ label }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error ?? "Failed to create backup");
  return json.data;
}

async function deleteBackup(filename: string): Promise<void> {
  const res = await fetch(`/api/admin/backup/${encodeURIComponent(filename)}`, {
    method: "DELETE",
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error ?? "Failed to delete backup");
}

async function restoreBackup(file: File): Promise<void> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/admin/restore", { method: "POST", body: form });
  const json = await res.json();
  if (!json.success) throw new Error(json.error ?? "Restore failed");
}

async function previewBackup(filename: string): Promise<BackupPreview> {
  const res = await fetch(`/api/admin/backup/${encodeURIComponent(filename)}/preview`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error ?? "Failed to preview backup");
  return json.data;
}

async function transferBackup(filename: string, connectionString: string): Promise<Record<string, number>> {
  const res = await fetch(`/api/admin/backup/${encodeURIComponent(filename)}/transfer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ connectionString }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error ?? "Transfer failed");
  return json.data.collections;
}

export default function BackupPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [createLabel, setCreateLabel] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<File | null>(null);
  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false);
  const [previewTarget, setPreviewTarget] = useState<string | null>(null);
  const [transferTarget, setTransferTarget] = useState<string | null>(null);
  const [transferConnectionString, setTransferConnectionString] = useState("");

  const { data: backups = [], isLoading, error } = useQuery({
    queryKey: ["admin-backups"],
    queryFn: fetchBackups,
  });

  const createMutation = useMutation({
    mutationFn: () => createBackup(createLabel.trim()),
    onSuccess: (backup) => {
      qc.invalidateQueries({ queryKey: ["admin-backups"] });
      setCreateOpen(false);
      setCreateLabel("");
      toast({ title: "Backup created", description: backup.filename });
    },
    onError: (err: Error) => {
      toast({ title: "Backup failed", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (filename: string) => deleteBackup(filename),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-backups"] });
      setDeleteTarget(null);
      toast({ title: "Backup deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (file: File) => restoreBackup(file),
    onSuccess: () => {
      setRestoreConfirmOpen(false);
      setRestoreTarget(null);
      toast({ title: "Restore complete", description: "Database has been restored." });
    },
    onError: (err: Error) => {
      setRestoreConfirmOpen(false);
      toast({ title: "Restore failed", description: err.message, variant: "destructive" });
    },
  });

  const { data: preview, isLoading: previewLoading, error: previewError } = useQuery({
    queryKey: ["admin-backup-preview", previewTarget],
    queryFn: () => previewBackup(previewTarget as string),
    enabled: !!previewTarget,
  });

  const transferMutation = useMutation({
    mutationFn: () => transferBackup(transferTarget as string, transferConnectionString.trim()),
    onSuccess: (collections) => {
      const total = Object.values(collections).reduce((sum, n) => sum + n, 0);
      setTransferTarget(null);
      setTransferConnectionString("");
      toast({ title: "Transfer complete", description: `${total} documents transferred.` });
    },
    onError: (err: Error) => {
      toast({ title: "Transfer failed", description: err.message, variant: "destructive" });
    },
  });

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".json.gz")) {
      toast({ title: "Invalid file", description: "Select a .json.gz backup file.", variant: "destructive" });
      return;
    }
    setRestoreTarget(file);
    setRestoreConfirmOpen(true);
    e.target.value = "";
  }

  function handleDownload(filename: string) {
    window.location.href = `/api/admin/backup/${encodeURIComponent(filename)}`;
  }

  return (
    <RoleGuard allowedRoles={["ADMIN"]}>
      <div className="flex flex-col gap-6 p-6">
        <Header
          title="Database Backup & Restore"
          subtitle="Create snapshots of your database and restore from a previous backup."
        />

        <div className="flex items-center gap-3">
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Backup
          </Button>
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mr-2 h-4 w-4" />
            Restore from File
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json.gz"
            className="hidden"
            onChange={handleFileSelect}
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => qc.invalidateQueries({ queryKey: ["admin-backups"] })}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{(error as Error).message}</AlertDescription>
          </Alert>
        )}

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Filename</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : backups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                    <Database className="mx-auto mb-2 h-8 w-8 opacity-30" />
                    No backups yet. Create your first backup.
                  </TableCell>
                </TableRow>
              ) : (
                backups.map((b) => (
                  <TableRow key={b.filename}>
                    <TableCell className="font-mono text-sm">{b.filename}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{formatBytes(b.size)}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(b.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setPreviewTarget(b.filename)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Preview
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownload(b.filename)}>
                            <Download className="mr-2 h-4 w-4" />
                            Download
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setTransferTarget(b.filename)}>
                            <Send className="mr-2 h-4 w-4" />
                            Transfer
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteTarget(b.filename)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Create Backup Dialog */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Backup</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="label">Label (optional)</Label>
                <Input
                  id="label"
                  placeholder="e.g. pre-migration"
                  value={createLabel}
                  onChange={(e) => setCreateLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !createMutation.isPending) {
                      createMutation.mutate();
                    }
                  }}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                All collections will be exported to a compressed JSON file stored on the server.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Backup
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirm Dialog */}
        <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Backup</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete <span className="font-mono font-medium">{deleteTarget}</span>? This cannot be undone.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={deleteMutation.isPending}
                onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
              >
                {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Restore Confirm Dialog */}
        <Dialog open={restoreConfirmOpen} onOpenChange={setRestoreConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Restore Database
              </DialogTitle>
            </DialogHeader>
            <Alert variant="destructive">
              <AlertDescription>
                <strong>This will overwrite all data</strong> in every collection with the contents of the backup. This action cannot be undone.
              </AlertDescription>
            </Alert>
            <p className="text-sm text-muted-foreground">
              File: <span className="font-mono font-medium">{restoreTarget?.name}</span>
            </p>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setRestoreConfirmOpen(false);
                  setRestoreTarget(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={restoreMutation.isPending}
                onClick={() => restoreTarget && restoreMutation.mutate(restoreTarget)}
              >
                {restoreMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Yes, Restore
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Preview Dialog */}
        <Dialog open={!!previewTarget} onOpenChange={() => setPreviewTarget(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Preview Backup</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground font-mono">{previewTarget}</p>
            {previewLoading ? (
              <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
            ) : previewError ? (
              <Alert variant="destructive">
                <AlertDescription>{(previewError as Error).message}</AlertDescription>
              </Alert>
            ) : (
              <div className="max-h-96 overflow-y-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Collection</TableHead>
                      <TableHead>Documents</TableHead>
                      <TableHead>Indexes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview?.collections.map((c) => (
                      <TableRow key={c.name}>
                        <TableCell className="font-mono text-sm">{c.name}</TableCell>
                        <TableCell>{c.count}</TableCell>
                        <TableCell>{c.indexCount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setPreviewTarget(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Transfer Dialog */}
        <Dialog
          open={!!transferTarget}
          onOpenChange={(open) => {
            if (!open) {
              setTransferTarget(null);
              setTransferConnectionString("");
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Transfer Backup</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              File: <span className="font-mono font-medium">{transferTarget}</span>
            </p>
            <Alert variant="destructive">
              <AlertDescription>
                This will insert the backup&apos;s data into the target database. Existing data with matching IDs will cause insert errors and be skipped.
              </AlertDescription>
            </Alert>
            <div className="space-y-2">
              <Label htmlFor="connectionString">Target MongoDB connection string</Label>
              <Input
                id="connectionString"
                type="password"
                placeholder="mongodb+srv://user:pass@host/db"
                value={transferConnectionString}
                onChange={(e) => setTransferConnectionString(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setTransferTarget(null);
                  setTransferConnectionString("");
                }}
              >
                Cancel
              </Button>
              <Button
                disabled={transferMutation.isPending || !transferConnectionString.trim()}
                onClick={() => transferMutation.mutate()}
              >
                {transferMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Transfer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RoleGuard>
  );
}
