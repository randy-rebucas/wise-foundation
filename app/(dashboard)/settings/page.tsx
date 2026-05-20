"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  User,
  Lock,
  Building2,
  Shield,
  Loader2,
  CheckCircle,
  Globe2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { AdminAppSettings } from "@/lib/types/appSettings";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { APP_TIMEZONE_OPTIONS } from "@/lib/constants/timezones";
import { isValidCurrencyCode, isValidIanaTimezone } from "@/lib/utils/intlValidation";
import { cn } from "@/lib/utils";

interface MeUser {
  name: string;
  email: string;
  phone?: string;
  organizationId?: string | null;
  organizationName?: string | null;
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const user = session?.user;

  const [profileForm, setProfileForm] = useState({ name: "", phone: "" });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [passwordError, setPasswordError] = useState("");

  const isAdmin = user?.role === "ADMIN";
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: meUser, isLoading: meLoading } = useQuery({
    queryKey: ["me-profile"],
    queryFn: async () => {
      const res = await fetch("/api/users/me");
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as MeUser;
    },
    enabled: !!session?.user,
  });

  useEffect(() => {
    if (meUser) {
      queueMicrotask(() => {
        setProfileForm({ name: meUser.name ?? "", phone: meUser.phone ?? "" });
      });
      return;
    }
    if (user?.name) {
      queueMicrotask(() => {
        setProfileForm((prev) => ({ ...prev, name: user.name }));
      });
    }
  }, [meUser, user?.name]);

  const { data: appSettings, isLoading: appSettingsLoading } = useQuery({
    queryKey: ["app-settings"],
    queryFn: async () => {
      const res = await fetch("/api/settings/app");
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data as AdminAppSettings;
    },
    enabled: !!isAdmin,
  });

  const { data: branches = [] } = useQuery({
    queryKey: ["branches-settings"],
    queryFn: async () => {
      const res = await fetch("/api/branches?limit=100");
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return (json.data ?? []) as { _id: string; name: string; code?: string }[];
    },
    enabled: !!isAdmin,
  });

  const [appForm, setAppForm] = useState({
    appName: "",
    appTagline: "",
    currency: "PHP",
    timezone: "Asia/Manila",
    memberDefaultDiscountPercent: 10,
    defaultLowStockThreshold: 10,
    receiptFooter: "",
    marketplaceFulfillmentBranchId: "",
  });

  useEffect(() => {
    if (!appSettings) return;
    queueMicrotask(() => {
      setAppForm({
        appName: appSettings.appName,
        appTagline: appSettings.appTagline,
        currency: appSettings.currency,
        timezone: appSettings.timezone,
        memberDefaultDiscountPercent: appSettings.memberDefaultDiscountPercent,
        defaultLowStockThreshold: appSettings.defaultLowStockThreshold,
        receiptFooter: appSettings.receiptFooter,
        marketplaceFulfillmentBranchId: appSettings.marketplaceFulfillmentBranchId ?? "",
      });
    });
  }, [appSettings]);

  const appSettingsMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/settings/app", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appName: appForm.appName.trim(),
          appTagline: appForm.appTagline.trim(),
          currency: appForm.currency.trim().toUpperCase(),
          timezone: appForm.timezone.trim(),
          memberDefaultDiscountPercent: Number(appForm.memberDefaultDiscountPercent),
          defaultLowStockThreshold: Number(appForm.defaultLowStockThreshold),
          receiptFooter: appForm.receiptFooter.trim(),
          marketplaceFulfillmentBranchId: appForm.marketplaceFulfillmentBranchId || "",
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data as AdminAppSettings;
    },
    onSuccess: () => {
      toast({ title: "Application settings saved" });
      queryClient.invalidateQueries({ queryKey: ["app-settings"] });
      router.refresh();
    },
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  const profileMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: profileForm.name, phone: profileForm.phone }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me-profile"] });
      toast({ title: "Profile updated successfully" });
    },
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  const passwordMutation = useMutation({
    mutationFn: async () => {
      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        throw new Error("New passwords do not match");
      }
      const res = await fetch("/api/users/me/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data;
    },
    onSuccess: () => {
      toast({ title: "Password changed successfully" });
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPasswordError("");
    },
    onError: (err: Error) => setPasswordError(err.message),
  });

  function handlePasswordSubmit() {
    setPasswordError("");
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters");
      return;
    }
    passwordMutation.mutate();
  }

  const appIntlValid = useMemo(
    () => ({
      currency: isValidCurrencyCode(appForm.currency),
      timezone: isValidIanaTimezone(appForm.timezone),
    }),
    [appForm.currency, appForm.timezone]
  );

  const displayName = meUser?.name ?? user?.name;
  const displayEmail = meUser?.email ?? user?.email;

  return (
    <div className="flex flex-col">
      <Header title="Settings" subtitle="Manage your account and preferences" />
      <div className="flex-1 p-6 max-w-3xl">
        <Tabs defaultValue="profile">
          <TabsList className="mb-6">
            <TabsTrigger value="profile">
              <User className="h-4 w-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="security">
              <Lock className="h-4 w-4 mr-2" />
              Security
            </TabsTrigger>
            <TabsTrigger value="account">
              <Building2 className="h-4 w-4 mr-2" />
              Account
            </TabsTrigger>
            {isAdmin ? (
              <TabsTrigger value="application">
                <Globe2 className="h-4 w-4 mr-2" />
                Application
              </TabsTrigger>
            ) : null}
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Personal Information</CardTitle>
                <CardDescription>Update your name and contact details.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 pb-4">
                  <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xl font-bold">
                    {displayName
                      ?.split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase() ?? "?"}
                  </div>
                  <div>
                    <p className="font-semibold">{displayName ?? "—"}</p>
                    <p className="text-sm text-muted-foreground">{displayEmail}</p>
                    <Badge variant="secondary" className="mt-1 text-xs">
                      {user?.role?.replace(/_/g, " ")}
                    </Badge>
                  </div>
                </div>

                <Separator />

                {profileMutation.isSuccess && (
                  <Alert variant="success">
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>Profile saved.</AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2 sm:col-span-1">
                    <Label>Full Name</Label>
                    {meLoading ? (
                      <Skeleton className="h-10 w-full" />
                    ) : (
                      <Input
                        value={profileForm.name}
                        onChange={(e) => {
                          profileMutation.reset();
                          setProfileForm((f) => ({ ...f, name: e.target.value }));
                        }}
                        placeholder="Your full name"
                      />
                    )}
                  </div>
                  <div className="space-y-2 col-span-2 sm:col-span-1">
                    <Label>Phone</Label>
                    {meLoading ? (
                      <Skeleton className="h-10 w-full" />
                    ) : (
                      <Input
                        value={profileForm.phone}
                        onChange={(e) => {
                          profileMutation.reset();
                          setProfileForm((f) => ({ ...f, phone: e.target.value }));
                        }}
                        placeholder="+63 9xx xxx xxxx"
                      />
                    )}
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Email</Label>
                    <Input value={displayEmail ?? ""} disabled className="bg-muted" />
                    <p className="text-xs text-muted-foreground">
                      Email cannot be changed. Contact your admin.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    onClick={() => profileMutation.mutate()}
                    disabled={
                      profileMutation.isPending ||
                      meLoading ||
                      profileForm.name.trim().length < 2
                    }
                  >
                    {profileMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Change Password
                </CardTitle>
                <CardDescription>
                  Use a strong password of at least 8 characters.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {passwordError && (
                  <Alert variant="destructive">
                    <AlertDescription>{passwordError}</AlertDescription>
                  </Alert>
                )}

                {passwordMutation.isSuccess && (
                  <Alert variant="success">
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>Password changed successfully.</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label>Current Password</Label>
                  <Input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => {
                      passwordMutation.reset();
                      setPasswordForm((f) => ({ ...f, currentPassword: e.target.value }));
                    }}
                    placeholder="••••••••"
                  />
                </div>
                <div className="space-y-2">
                  <Label>New Password</Label>
                  <Input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => {
                      passwordMutation.reset();
                      setPasswordForm((f) => ({ ...f, newPassword: e.target.value }));
                    }}
                    placeholder="••••••••"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Confirm New Password</Label>
                  <Input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => {
                      passwordMutation.reset();
                      setPasswordForm((f) => ({ ...f, confirmPassword: e.target.value }));
                    }}
                    placeholder="••••••••"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    onClick={handlePasswordSubmit}
                    disabled={
                      passwordMutation.isPending ||
                      !passwordForm.currentPassword ||
                      !passwordForm.newPassword ||
                      !passwordForm.confirmPassword
                    }
                  >
                    {passwordMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Change Password
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Active Session</CardTitle>
                <CardDescription>You are currently signed in.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">{displayName}</p>
                    <p className="text-muted-foreground">{displayEmail}</p>
                  </div>
                  <Badge variant="success">Active</Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Account Tab */}
          <TabsContent value="account" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Account Details
                </CardTitle>
                <CardDescription>Your role and organization information.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: "Role", value: user?.role?.replace(/_/g, " ") },
                  {
                    label: "Organization",
                    value: meLoading ? "…" : meUser?.organizationName?.trim() || "—",
                  },
                  {
                    label: "Organization ID",
                    value: meLoading ? "…" : meUser?.organizationId ?? "—",
                    mono: true,
                  },
                  {
                    label: "Branches",
                    value: user?.branchIds?.length
                      ? `${user.branchIds.length} branch${user.branchIds.length > 1 ? "es" : ""} assigned`
                      : "None",
                  },
                  {
                    label: "Permissions",
                    value: user?.permissions?.length
                      ? `${user.permissions.length} permissions`
                      : "None",
                  },
                ].map(({ label, value, mono }) => (
                  <div key={label} className="flex items-center justify-between gap-4 py-2 border-b last:border-0">
                    <span className="text-sm text-muted-foreground shrink-0">{label}</span>
                    <span
                      className={cn(
                        "text-sm font-medium text-right min-w-0 break-all",
                        mono && "font-mono text-xs"
                      )}
                    >
                      {value ?? "—"}
                    </span>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground pt-2 border-t">
                  Notification and email preferences are not available yet.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {isAdmin ? (
            <TabsContent value="application" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Globe2 className="h-4 w-4" />
                    Application
                  </CardTitle>
                  <CardDescription>
                    Store name, currency, timezone, and defaults for POS, members, inventory, and reports.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {appSettingsLoading ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Skeleton className="h-10 sm:col-span-2" />
                      <Skeleton className="h-10 sm:col-span-2" />
                      <Skeleton className="h-10" />
                      <Skeleton className="h-10" />
                      <Skeleton className="h-10" />
                      <Skeleton className="h-10" />
                      <Skeleton className="h-24 sm:col-span-2" />
                    </div>
                  ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="appName">Application name</Label>
                      <Input
                        id="appName"
                        value={appForm.appName}
                        onChange={(e) => setAppForm((f) => ({ ...f, appName: e.target.value }))}
                        placeholder="Glowish"
                      />
                      <p className="text-xs text-muted-foreground">Shown in the sidebar and printed receipts.</p>
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="appTagline">Tagline</Label>
                      <Input
                        id="appTagline"
                        value={appForm.appTagline}
                        onChange={(e) => setAppForm((f) => ({ ...f, appTagline: e.target.value }))}
                        placeholder="POS & online store"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currency">Currency (ISO 4217)</Label>
                      <Input
                        id="currency"
                        value={appForm.currency}
                        onChange={(e) => setAppForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))}
                        placeholder="PHP"
                        maxLength={10}
                        className={cn(
                          "font-mono text-sm max-w-xs",
                          !appIntlValid.currency && appForm.currency.trim() && "border-destructive"
                        )}
                      />
                      <p className="text-xs text-muted-foreground">Examples: PHP, USD, SGD. Used for amounts and reports across the app.</p>
                      {!appIntlValid.currency && appForm.currency.trim() ? (
                        <p className="text-xs text-destructive">Enter a valid ISO 4217 currency code.</p>
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tz">Timezone (IANA)</Label>
                      <Input
                        id="tz"
                        list="tz-suggestions"
                        value={appForm.timezone}
                        onChange={(e) => setAppForm((f) => ({ ...f, timezone: e.target.value }))}
                        placeholder="Asia/Manila"
                        className={cn(
                          "font-mono text-sm",
                          !appIntlValid.timezone && appForm.timezone.trim() && "border-destructive"
                        )}
                      />
                      <datalist id="tz-suggestions">
                        {APP_TIMEZONE_OPTIONS.map((t) => (
                          <option key={t.value} value={t.value} label={t.label} />
                        ))}
                      </datalist>
                      <p className="text-xs text-muted-foreground">
                        Used for receipts, POS, and dashboard dates.
                      </p>
                      {!appIntlValid.timezone && appForm.timezone.trim() ? (
                        <p className="text-xs text-destructive">Enter a valid IANA timezone (e.g. Asia/Manila).</p>
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="memberDisc">Default member discount %</Label>
                      <Input
                        id="memberDisc"
                        type="number"
                        min={0}
                        max={100}
                        value={appForm.memberDefaultDiscountPercent}
                        onChange={(e) =>
                          setAppForm((f) => ({
                            ...f,
                            memberDefaultDiscountPercent: parseInt(e.target.value, 10) || 0,
                          }))
                        }
                      />
                      <p className="text-xs text-muted-foreground">Pre-filled when registering a new member.</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lowStock">Default low-stock threshold</Label>
                      <Input
                        id="lowStock"
                        type="number"
                        min={1}
                        value={appForm.defaultLowStockThreshold}
                        onChange={(e) =>
                          setAppForm((f) => ({
                            ...f,
                            defaultLowStockThreshold: parseInt(e.target.value, 10) || 1,
                          }))
                        }
                      />
                      <p className="text-xs text-muted-foreground">Used when new branch inventory rows are created.</p>
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label>Marketplace fulfillment branch</Label>
                      <Select
                        value={appForm.marketplaceFulfillmentBranchId || "__default__"}
                        onValueChange={(v) =>
                          setAppForm((f) => ({
                            ...f,
                            marketplaceFulfillmentBranchId: v === "__default__" ? "" : v,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Head office (default)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__default__">Head office (default)</SelectItem>
                          {branches.map((b) => (
                            <SelectItem key={b._id} value={b._id}>
                              {b.name}
                              {b.code ? ` (${b.code})` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Branch inventory used when customers place online orders. Leave as head office if unset.
                      </p>
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="receiptFooter">Receipt footer</Label>
                      <textarea
                        id="receiptFooter"
                        value={appForm.receiptFooter}
                        onChange={(e) => setAppForm((f) => ({ ...f, receiptFooter: e.target.value }))}
                        placeholder="Optional message on printed receipts (e.g. return policy, TIN)."
                        rows={3}
                        className={cn(
                          "flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm",
                          "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                          "disabled:cursor-not-allowed disabled:opacity-50"
                        )}
                      />
                    </div>
                  </div>
                  )}
                  <div className="flex justify-end pt-2">
                    <Button
                      onClick={() => appSettingsMutation.mutate()}
                      disabled={
                        appSettingsMutation.isPending ||
                        appSettingsLoading ||
                        !appForm.appName.trim() ||
                        !appIntlValid.currency ||
                        !appIntlValid.timezone ||
                        !Number.isFinite(Number(appForm.memberDefaultDiscountPercent)) ||
                        Number(appForm.memberDefaultDiscountPercent) < 0 ||
                        Number(appForm.memberDefaultDiscountPercent) > 100 ||
                        !Number.isFinite(Number(appForm.defaultLowStockThreshold)) ||
                        Number(appForm.defaultLowStockThreshold) < 1
                      }
                    >
                      {appSettingsMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      Save application settings
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          ) : null}

        </Tabs>
      </div>
    </div>
  );
}
