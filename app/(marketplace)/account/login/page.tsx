"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { getStaffHomePath } from "@/lib/navigation/staffHome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AppBrand } from "@/components/branding/AppBrand";
import { MarketplacePageShell } from "@/components/marketplace/MarketplacePageShell";
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
      router.replace(getStaffHomePath(session.user));
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
        setError(
          result.code === "AccountLocked"
            ? "Too many failed attempts. Your account is temporarily locked — try again in a few minutes."
            : "Invalid email or password"
        );
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
    <div className="overflow-hidden rounded-[10px] border border-white/60 bg-white/40 p-6 shadow-[0_18px_60px_rgba(70,90,58,0.14)] backdrop-blur-xl sm:p-8">
      <AppBrand theme="account" className="mb-3" priority />
      <h1 className="font-[family-name:var(--font-playfair-display)] text-2xl font-semibold text-[#1e3157]">
        Sign in
      </h1>
      <p className="mt-1 text-sm text-[#2A4C6A]/75">
        Use the email and password you chose when you registered.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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
            className="rounded-[10px] border-white/70 bg-white/65"
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
              className="rounded-[10px] border-white/70 bg-white/65 pr-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#2A4C6A]/45"
              onClick={() => setShowPassword((open) => !open)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <Button
          type="submit"
          className="h-12 w-full rounded-[10px] bg-gradient-to-r from-[#6ea43f] to-[#477d34] text-white"
          disabled={loading}
        >
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

      <div className="mt-6 flex flex-col gap-3 text-sm text-[#2A4C6A]/75">
        <p className="text-center">
          New here?{" "}
          <Link href="/account/register" className="font-semibold text-emerald-600 hover:underline">
            Create an account
          </Link>
        </p>
        <p className="border-t border-emerald-100 pt-3 text-center text-xs text-[#2A4C6A]/65">
          <span className="mb-1 block uppercase tracking-wide">Distributor or staff?</span>
          <Link href="/login" className="font-semibold text-[#6ea43f] hover:underline">
            Team & distributor sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function AccountLoginPage() {
  return (
    <MarketplacePageShell gap="" innerClassName="flex justify-center">
      <div className="w-full max-w-md">
        <Suspense fallback={<div className="py-12 text-center text-muted-foreground">Loading…</div>}>
          <AccountLoginForm />
        </Suspense>
      </div>
    </MarketplacePageShell>
  );
}
