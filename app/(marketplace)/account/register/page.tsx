"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { getStaffHomePath } from "@/lib/navigation/staffHome";
import {
  Eye,
  EyeOff,
  FileText,
  Gift,
  Home,
  Loader2,
  Lock,
  Mail,
  Sparkles,
  Star,
  User,
  UserPlus,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const STOCK_PRODUCT_IMAGE =
  "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=900&q=80";

const BENEFITS = [
  { title: "Exclusive Deals", icon: Sparkles },
  { title: "Reward Points", icon: Star },
  { title: "Early Access", icon: Home },
  { title: "Expert Skincare Tips", icon: FileText },
];


function passwordStrengthLabel(password: string) {
  if (!password) {
    return { label: "Weak", width: "w-1/4", barClass: "bg-red-400", textClass: "text-red-600" };
  }
  if (password.length < 8) {
    return { label: "Weak", width: "w-1/3", barClass: "bg-red-400", textClass: "text-red-600" };
  }
  if (password.length < 12) {
    return { label: "Medium", width: "w-2/3", barClass: "bg-amber-400", textClass: "text-amber-700" };
  }
  return { label: "Strong", width: "w-full", barClass: "bg-[#6ea43f]", textClass: "text-[#2B6B56]" };
}

export default function AccountRegisterPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const strength = useMemo(() => passwordStrengthLabel(password), [password]);

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
    if (!acceptedTerms) {
      setError("Please accept the Terms & Conditions and Privacy Policy.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/account/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, confirmPassword }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error ?? "Could not create account");
        return;
      }

      const sign = await signIn("credentials", {
        email,
        password,
        audience: "customer",
        redirect: false,
      });
      if (sign?.error) {
        setError("Account created but sign-in failed. Try signing in manually.");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (status === "loading") {
    return (
      <div className="-mx-4 -my-8 flex justify-center py-20 font-[family-name:var(--font-plus-jakarta-sans)]">
        <Loader2 className="h-8 w-8 animate-spin text-[#6ea43f]" />
      </div>
    );
  }

  return (
    <div className="-mx-4 -my-8 min-h-full px-4 py-8 font-[family-name:var(--font-plus-jakarta-sans)] text-[#2A4C6A]">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="grid gap-6 overflow-hidden rounded-[2rem] border border-white/60 bg-white/35 shadow-[0_24px_80px_rgba(94,70,135,0.16)] backdrop-blur-xl lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]">
          <article className="bg-white/80 p-6 sm:p-8 lg:p-10">
            <h1 className="font-[family-name:var(--font-playfair-display)] text-3xl font-semibold text-[#1e3157] sm:text-4xl">
              Create Your Account
            </h1>
            <p className="mt-2 font-[family-name:var(--font-great-vibes)] text-3xl text-[#d965c9] sm:text-4xl">
              Join the Glow Community!
            </p>
            <p className="mt-3 text-sm leading-6 text-[#2A4C6A]/75">
              Sign up and enjoy exclusive offers, rewards and a better shopping experience.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#2A4C6A]/45" />
                  <Input
                    id="name"
                    autoComplete="name"
                    placeholder="Enter your full name"
                    className="rounded-xl border-white/70 bg-white/65 pl-9"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    minLength={2}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#2A4C6A]/45" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="Enter your email"
                    className="rounded-xl border-white/70 bg-white/65 pl-9"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#2A4C6A]/45" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Create a password"
                    className="rounded-xl border-white/70 bg-white/65 px-9"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
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
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#2A4C6A]/65">Password strength</span>
                    <span className={cn("font-semibold", strength.textClass)}>
                      {strength.label}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-violet-100">
                    <div className={cn("h-full rounded-full transition-all", strength.width, strength.barClass)} />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#2A4C6A]/45" />
                  <Input
                    id="confirm"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Confirm your password"
                    className="rounded-xl border-white/70 bg-white/65 px-9"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#2A4C6A]/45"
                    onClick={() => setShowConfirmPassword((open) => !open)}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <label className="flex items-start gap-2 text-sm leading-6 text-[#2A4C6A]/78">
                <Checkbox
                  checked={acceptedTerms}
                  onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                  className="mt-0.5"
                />
                <span>
                  I agree to the{" "}
                  <Link href="/contact" className="font-semibold text-violet-600 hover:underline">
                    Terms &amp; Conditions
                  </Link>{" "}
                  and{" "}
                  <Link href="/contact" className="font-semibold text-violet-600 hover:underline">
                    Privacy Policy
                  </Link>
                </span>
              </label>

              <Button
                type="submit"
                className="h-12 w-full rounded-xl bg-gradient-to-r from-[#6ea43f] to-[#477d34] text-white"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account…
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Sign Up
                  </>
                )}
              </Button>

              <div className="relative py-2 text-center text-xs text-[#2A4C6A]/60">
                <span className="bg-white/80 px-3">or continue with</span>
                <span className="absolute inset-x-0 top-1/2 -z-10 h-px bg-violet-100" />
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {["Google", "Facebook", "Apple"].map((provider) => (
                  <Button
                    key={provider}
                    type="button"
                    variant="outline"
                    className="rounded-xl border-white/70 bg-white/65 text-xs"
                  >
                    {provider}
                  </Button>
                ))}
              </div>

              <p className="text-center text-sm text-[#2A4C6A]/75">
                Already have an account?{" "}
                <Link href="/account/login" className="font-semibold text-violet-600 hover:underline">
                  Login
                </Link>
              </p>
              <p className="border-t border-violet-100 pt-3 text-center text-xs text-[#2A4C6A]/65">
                <Link href="/login" className="font-semibold text-[#6ea43f] hover:underline">
                  Distributor / team sign in
                </Link>
              </p>
            </form>
          </article>

          <aside className="relative overflow-hidden bg-gradient-to-br from-violet-100/80 via-pink-50/70 to-white/40 p-6 sm:p-8 lg:p-10">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(255,255,255,0.65),transparent_35%)]" />
            <div className="relative">
              <h2 className="font-[family-name:var(--font-playfair-display)] text-3xl font-semibold text-[#1e3157] sm:text-4xl">
                Good for Your Skin,
              </h2>
              <p className="font-[family-name:var(--font-great-vibes)] text-4xl text-[#d965c9] sm:text-5xl">
                Good for You
              </p>
              <p className="mt-4 max-w-md text-sm leading-7 text-[#2A4C6A]/78">
                Be the first to know about new arrivals, special offers and skincare tips.
              </p>
              <ul className="mt-6 space-y-4">
                {BENEFITS.map((benefit) => (
                  <li key={benefit.title} className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 text-violet-600">
                      <benefit.icon className="h-5 w-5" />
                    </span>
                    <span className="text-sm font-semibold text-[#1e3157]">{benefit.title}</span>
                  </li>
                ))}
              </ul>
              <div
                className="mt-8 h-56 rounded-[2rem] bg-cover bg-center shadow-[0_24px_65px_rgba(68,47,107,0.2)]"
                style={{ backgroundImage: `url(${STOCK_PRODUCT_IMAGE})` }}
              />
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}
