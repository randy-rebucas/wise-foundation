"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AppBrand } from "@/components/branding/AppBrand";
import { Eye, EyeOff, Loader2 } from "lucide-react";

function AccountLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user) return;
    if (session.user.role === "CUSTOMER") {
      router.replace("/account");
    } else {
      router.replace("/login");
    }
  }, [status, session, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        audience: "customer",
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  if (status === "loading") {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card className="border-0 shadow-xl">
      <CardHeader className="space-y-1 pb-4">
        <AppBrand
          theme="account"
          appName="Shop account"
          appTagline="Sign in to track orders and check out faster"
          className="mb-3"
          priority
        />
        <CardTitle className="text-2xl font-bold">Sign in</CardTitle>
        <CardDescription>Use the email and password you chose when you registered.</CardDescription>
      </CardHeader>
      <CardContent>
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
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className="pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword((open) => !open)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in…
              </>
            ) : (
              "Sign in"
            )}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col gap-3 text-sm text-muted-foreground">
        <p className="text-center">
          New here?{" "}
          <Link href="/account/register" className="text-primary font-medium hover:underline">
            Create an account
          </Link>
        </p>
        <p className="text-center border-t pt-3">
          <span className="block text-xs uppercase tracking-wide mb-1">Distributor or staff?</span>
          <Link href="/login" className="text-primary font-medium hover:underline">
            Team & distributor sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}

export default function AccountLoginPage() {
  return (
    <div className="mx-auto w-full max-w-md py-8">
      <Suspense fallback={<div className="text-center text-muted-foreground py-12">Loading…</div>}>
        <AccountLoginForm />
      </Suspense>
    </div>
  );
}
