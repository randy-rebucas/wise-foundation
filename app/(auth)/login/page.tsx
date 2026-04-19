"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ShoppingBag, ShieldCheck } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const setupDone = searchParams.get("setup") === "done";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
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

  return (
    <Card className="border-0 shadow-2xl">
      <CardHeader className="space-y-1 pb-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-2 bg-primary rounded-lg">
            <ShoppingBag className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-lg">Wise Livelihood Platform</span>
        </div>
        <CardTitle className="text-2xl font-bold">Distributor Portal</CardTitle>
        <CardDescription>Sign in with your authorized distributor account</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {setupDone && (
            <Alert>
              <AlertDescription>Setup complete! Sign in with your admin account.</AlertDescription>
            </Alert>
          )}
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
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col gap-3">
        <div className="flex items-start gap-2 rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
          <ShieldCheck className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
          <p>
            This portal is <span className="font-semibold text-foreground">exclusively for authorized distributors</span>.
            Account access is granted by the administrator only — self-registration is not supported.
          </p>
        </div>
        <p className="text-xs text-muted-foreground text-center">
          Contact your administrator if you need access.
        </p>
      </CardFooter>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
