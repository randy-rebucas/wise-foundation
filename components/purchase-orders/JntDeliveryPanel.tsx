"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Loader2, Package, RefreshCw, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useFormatDateTime } from "@/components/providers/TenantProvider";

type JntShipment = {
  trackingNumber: string;
  billCode?: string;
  sortingCode?: string;
  status: string;
  statusLabel?: string;
  bookedAt?: string;
  lastSyncedAt?: string;
  recipientName?: string;
  recipientPhone?: string;
  recipientAddress?: string;
  recipientCity?: string;
  recipientRegion?: string;
  weightKg?: number;
};

type OrgPrefill = {
  name?: string;
  contactPerson?: string;
  phone?: string;
  address?: string;
};

interface JntDeliveryPanelProps {
  poId: string;
  poNumber: string;
  poStatus: string;
  organization?: OrgPrefill | null;
  shipment?: JntShipment | null;
}

const JNT_TRACK_URL = "https://www.jtexpress.ph/track-and-trace";

export function JntDeliveryPanel({
  poId,
  poNumber,
  poStatus,
  organization,
  shipment,
}: JntDeliveryPanelProps) {
  const dateTime = useFormatDateTime();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: jntConfig } = useQuery({
    queryKey: ["jnt-config"],
    queryFn: async () => {
      const res = await fetch("/api/jnt/config");
      const json = await res.json();
      return json.data as { enabled: boolean };
    },
    staleTime: 60_000,
  });

  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [recipientCity, setRecipientCity] = useState("Metro Manila");
  const [recipientRegion, setRecipientRegion] = useState("NCR");
  const [weightKg, setWeightKg] = useState("1");
  const [remark, setRemark] = useState("");

  useEffect(() => {
    if (shipment?.recipientName) {
      setRecipientName(shipment.recipientName);
      setRecipientPhone(shipment.recipientPhone ?? "");
      setRecipientAddress(shipment.recipientAddress ?? "");
      setRecipientCity(shipment.recipientCity ?? "Metro Manila");
      setRecipientRegion(shipment.recipientRegion ?? "NCR");
      return;
    }
    setRecipientName(organization?.contactPerson || organization?.name || "");
    setRecipientPhone(organization?.phone ?? "");
    setRecipientAddress(organization?.address ?? "");
    setRemark(`Delivery for ${poNumber}`);
  }, [organization, poNumber, shipment]);

  const bookMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/purchase-orders/${poId}/jnt/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientName: recipientName.trim(),
          recipientPhone: recipientPhone.trim(),
          recipientAddress: recipientAddress.trim(),
          recipientCity: recipientCity.trim(),
          recipientRegion: recipientRegion.trim(),
          weightKg: parseFloat(weightKg) || 1,
          remark: remark.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Booking failed");
      return json.data as { trackingNumber: string };
    },
    onSuccess: (data) => {
      toast({
        title: "J&T delivery booked",
        description: `Tracking: ${data.trackingNumber}`,
      });
      queryClient.invalidateQueries({ queryKey: ["purchase-order", poId] });
    },
    onError: (err) => {
      toast({
        variant: "destructive",
        title: "Could not book J&T",
        description: err instanceof Error ? err.message : "Try again",
      });
    },
  });

  const trackMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/purchase-orders/${poId}/jnt/track`, {
        method: "POST",
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Tracking failed");
      return json.data as { statusLabel: string };
    },
    onSuccess: (data) => {
      toast({ title: "Tracking updated", description: data.statusLabel });
      queryClient.invalidateQueries({ queryKey: ["purchase-order", poId] });
    },
    onError: (err) => {
      toast({
        variant: "destructive",
        title: "Could not refresh tracking",
        description: err instanceof Error ? err.message : "Try again",
      });
    },
  });

  if (!jntConfig?.enabled) {
    return (
      <Alert>
        <Truck className="h-4 w-4" />
        <AlertDescription>
          J&T Express is not configured. Add <code className="text-xs">JNT_API_ACCOUNT</code>,{" "}
          <code className="text-xs">JNT_PRIVATE_KEY</code>, <code className="text-xs">JNT_CUSTOMER_CODE</code>
          , and origin address variables to enable courier booking on deliveries.
        </AlertDescription>
      </Alert>
    );
  }

  if (poStatus !== "approved" && !shipment?.trackingNumber) {
    return (
      <Alert>
        <Package className="h-4 w-4" />
        <AlertDescription>
          Book J&T delivery after the purchase order is approved.
        </AlertDescription>
      </Alert>
    );
  }

  if (shipment?.trackingNumber) {
    return (
      <div className="space-y-4 rounded-lg border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">J&T delivery</h3>
          </div>
          <Badge variant={shipment.status === "delivered" ? "success" : "default"}>
            {shipment.statusLabel ?? shipment.status}
          </Badge>
        </div>
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">Tracking number</p>
            <p className="font-mono font-medium">{shipment.trackingNumber}</p>
          </div>
          {shipment.billCode ? (
            <div>
              <p className="text-xs text-muted-foreground">Bill code</p>
              <p className="font-mono">{shipment.billCode}</p>
            </div>
          ) : null}
          {shipment.bookedAt ? (
            <div>
              <p className="text-xs text-muted-foreground">Booked</p>
              <p>{dateTime(shipment.bookedAt)}</p>
            </div>
          ) : null}
          {shipment.lastSyncedAt ? (
            <div>
              <p className="text-xs text-muted-foreground">Last synced</p>
              <p>{dateTime(shipment.lastSyncedAt)}</p>
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => trackMutation.mutate()}
            disabled={trackMutation.isPending}
          >
            {trackMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh tracking
          </Button>
          <Button type="button" variant="outline" size="sm" asChild>
            <a
              href={`${JNT_TRACK_URL}?billcode=${encodeURIComponent(shipment.trackingNumber)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Track on J&T
            </a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex items-center gap-2">
        <Truck className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Book J&T delivery</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        Creates a J&T Express pickup for this approved order. The tracking number is saved on the
        purchase order.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="jntRecipientName">Recipient name</Label>
          <Input
            id="jntRecipientName"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="jntRecipientPhone">Phone</Label>
          <Input
            id="jntRecipientPhone"
            value={recipientPhone}
            onChange={(e) => setRecipientPhone(e.target.value)}
            placeholder="09XX XXX XXXX"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="jntWeight">Weight (kg)</Label>
          <Input
            id="jntWeight"
            type="number"
            min={0.1}
            step={0.1}
            value={weightKg}
            onChange={(e) => setWeightKg(e.target.value)}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="jntAddress">Delivery address</Label>
          <Input
            id="jntAddress"
            value={recipientAddress}
            onChange={(e) => setRecipientAddress(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="jntCity">City</Label>
          <Input id="jntCity" value={recipientCity} onChange={(e) => setRecipientCity(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="jntRegion">Province / region</Label>
          <Input
            id="jntRegion"
            value={recipientRegion}
            onChange={(e) => setRecipientRegion(e.target.value)}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="jntRemark">Remark (optional)</Label>
          <Input id="jntRemark" value={remark} onChange={(e) => setRemark(e.target.value)} />
        </div>
      </div>
      <Button
        type="button"
        onClick={() => bookMutation.mutate()}
        disabled={
          bookMutation.isPending ||
          !recipientName.trim() ||
          !recipientPhone.trim() ||
          !recipientAddress.trim()
        }
      >
        {bookMutation.isPending ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Truck className="h-4 w-4 mr-2" />
        )}
        Book J&T pickup
      </Button>
    </div>
  );
}
