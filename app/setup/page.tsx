"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Settings } from "lucide-react";

export default function SetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/setup")
      .then((r) => r.json())
      .then((d) => {
        if (!d.setupRequired) router.replace("/login");
      })
      .catch(() => {});
  }, [router]);

  const [form, setForm] = useState({
    appName: "Wise POS",
    currency: "PHP",
    timezone: "Asia/Manila",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
    confirmPassword: "",
  });

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (form.adminPassword !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (form.adminPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appName: form.appName,
          currency: form.currency,
          timezone: form.timezone,
          adminName: form.adminName,
          adminEmail: form.adminEmail,
          adminPassword: form.adminPassword,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error ?? "Setup failed");
      } else {
        router.push("/login?setup=done");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="p-3 bg-primary rounded-xl">
              <Settings className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-3xl font-bold">Welcome to Wise POS</h1>
          <p className="text-muted-foreground">Complete the setup to get started</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* App Settings */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">App Settings</CardTitle>
                <CardDescription>Configure your application</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="appName">App Name</Label>
                  <Input
                    id="appName"
                    value={form.appName}
                    onChange={(e) => set("appName", e.target.value)}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="currency">Currency</Label>
                    <Input
                      id="currency"
                      value={form.currency}
                      onChange={(e) => set("currency", e.target.value)}
                      placeholder="PHP"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Input
                      id="timezone"
                      value={form.timezone}
                      onChange={(e) => set("timezone", e.target.value)}
                      placeholder="Asia/Manila"
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Admin Account */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Admin Account</CardTitle>
                <CardDescription>Create your administrator account</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="adminName">Full Name</Label>
                  <Input
                    id="adminName"
                    value={form.adminName}
                    onChange={(e) => set("adminName", e.target.value)}
                    placeholder="John Doe"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="adminEmail">Email</Label>
                  <Input
                    id="adminEmail"
                    type="email"
                    value={form.adminEmail}
                    onChange={(e) => set("adminEmail", e.target.value)}
                    placeholder="admin@example.com"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="adminPassword">Password</Label>
                  <Input
                    id="adminPassword"
                    type="password"
                    value={form.adminPassword}
                    onChange={(e) => set("adminPassword", e.target.value)}
                    placeholder="Min. 8 characters"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={form.confirmPassword}
                    onChange={(e) => set("confirmPassword", e.target.value)}
                    placeholder="Repeat password"
                    required
                  />
                </div>
              </CardContent>
            </Card>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Complete Setup"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
