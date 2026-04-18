"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { ChevronDown, CheckCircle2, XCircle, Clock, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  tenantId: string;
  currentStatus: string;
}

export function TenantDetailActions({ tenantId, currentStatus }: Props) {
  const { toast } = useToast();
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const statusMutation = useMutation({
    mutationFn: async (status: string) => {
      const res = await fetch(`/api/super-admin/tenants/${tenantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
    },
    onSuccess: (_d, status) => {
      toast({ title: `Tenant ${status}` });
      router.refresh();
    },
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/super-admin/tenants/${tenantId}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
    },
    onSuccess: () => {
      toast({ title: "Tenant deleted" });
      router.push("/super-admin/tenants");
    },
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  const isPending = statusMutation.isPending || deleteMutation.isPending;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={isPending}>
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : null}
            Actions
            <ChevronDown className="h-4 w-4 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {currentStatus !== "active" && (
            <DropdownMenuItem onClick={() => statusMutation.mutate("active")}>
              <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
              Activate
            </DropdownMenuItem>
          )}
          {currentStatus !== "trial" && (
            <DropdownMenuItem onClick={() => statusMutation.mutate("trial")}>
              <Clock className="h-4 w-4 mr-2 text-yellow-600" />
              Set to Trial
            </DropdownMenuItem>
          )}
          {currentStatus !== "suspended" && (
            <DropdownMenuItem onClick={() => statusMutation.mutate("suspended")}>
              <XCircle className="h-4 w-4 mr-2 text-orange-600" />
              Suspend
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Tenant
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete this tenant?</DialogTitle>
            <DialogDescription>
              This will soft-delete the tenant and suspend all access. This action cannot be undone from the UI.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
