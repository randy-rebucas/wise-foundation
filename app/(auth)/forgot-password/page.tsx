"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AppBrand } from "@/components/branding/AppBrand";
import { Loader2, ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        setError("Something went wrong. Please try again.");
        return;
      }

      setSent(true);
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-0 shadow-2xl">
      <CardHeader className="space-y-1 pb-4">
        <AppBrand theme="auth" className="mb-3" priority />
        <CardTitle className="text-2xl font-bold">Forgot password</CardTitle>
        <CardDescription>Enter your team account email and we'll send a reset link.</CardDescription>
      </CardHeader>
      <CardContent>
        {sent ? (
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                If that email is linked to a team account, a password reset link has been sent. Check your inbox.
              </AlertDescription>
            </Alert>
            <Link href="/login">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to sign in
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send reset link"
              )}
            </Button>
          </form>
        )}
      </CardContent>
      {!sent && (
        <CardFooter>
          <p className="text-xs text-muted-foreground text-center w-full">
            <Link href="/login" className="text-primary hover:underline inline-flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" />
              Back to sign in
            </Link>
          </p>
        </CardFooter>
      )}
    </Card>
  );
}
