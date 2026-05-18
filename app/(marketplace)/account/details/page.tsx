"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { AccountPageHeader } from "@/components/marketplace/account/AccountPageHeader";
import { formatMemberSince } from "@/components/marketplace/account/orderUtils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type MeProfile = {
  name: string;
  email: string;
  phone?: string;
  createdAt?: string;
};

export default function AccountDetailsPage() {
  const [profile, setProfile] = useState<MeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileForm, setProfileForm] = useState({ name: "", phone: "" });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [profileMsg, setProfileMsg] = useState("");
  const [profileError, setProfileError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordMsg, setPasswordMsg] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users/me");
      const json = await res.json();
      if (res.ok && json.success) {
        const data = json.data as MeProfile & { createdAt?: string };
        setProfile(data);
        setProfileForm({ name: data.name ?? "", phone: data.phone ?? "" });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileError("");
    setProfileMsg("");
    setSavingProfile(true);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileForm),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setProfileError(json.error ?? "Could not update profile");
        return;
      }
      setProfileMsg("Profile updated successfully.");
      await load();
    } catch {
      setProfileError("Could not update profile");
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError("");
    setPasswordMsg("");
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters");
      return;
    }
    setSavingPassword(true);
    try {
      const res = await fetch("/api/users/me/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setPasswordError(json.error ?? "Could not change password");
        return;
      }
      setPasswordMsg("Password changed successfully.");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch {
      setPasswordError("Could not change password");
    } finally {
      setSavingPassword(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-[#6ea43f]" />
      </div>
    );
  }

  return (
    <>
      <AccountPageHeader
        title="Account Details"
        description="Update your profile and sign-in password."
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <form
          onSubmit={saveProfile}
          className="rounded-2xl border border-white/65 bg-white/60 p-5 shadow-sm"
        >
          <h2 className="font-semibold text-[#1e3157]">Profile</h2>
          <p className="mt-1 text-xs text-[#2A4C6A]/65">
            Member since {formatMemberSince(profile?.createdAt ?? "")}
          </p>
          <div className="mt-4 space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={profile?.email ?? ""}
                disabled
                className="mt-1 rounded-xl border-white/70 bg-white/50"
              />
            </div>
            <div>
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                value={profileForm.name}
                onChange={(e) => setProfileForm((f) => ({ ...f, name: e.target.value }))}
                required
                className="mt-1 rounded-xl border-white/70 bg-white/80"
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={profileForm.phone}
                onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+63 912 345 6789"
                className="mt-1 rounded-xl border-white/70 bg-white/80"
              />
            </div>
            {profileError ? (
              <Alert variant="destructive">
                <AlertDescription>{profileError}</AlertDescription>
              </Alert>
            ) : null}
            {profileMsg ? (
              <p className="text-sm font-medium text-[#6ea43f]">{profileMsg}</p>
            ) : null}
            <Button
              type="submit"
              disabled={savingProfile}
              className="rounded-xl bg-[#6ea43f] text-white hover:bg-[#5d9235]"
            >
              {savingProfile ? "Saving…" : "Save profile"}
            </Button>
          </div>
        </form>

        <form
          onSubmit={savePassword}
          className="rounded-2xl border border-white/65 bg-white/60 p-5 shadow-sm"
        >
          <h2 className="font-semibold text-[#1e3157]">Password</h2>
          <p className="mt-1 text-xs text-[#2A4C6A]/65">Use at least 8 characters.</p>
          <div className="mt-4 space-y-4">
            <div>
              <Label htmlFor="current">Current password</Label>
              <Input
                id="current"
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) =>
                  setPasswordForm((f) => ({ ...f, currentPassword: e.target.value }))
                }
                required
                className="mt-1 rounded-xl border-white/70 bg-white/80"
              />
            </div>
            <div>
              <Label htmlFor="new">New password</Label>
              <Input
                id="new"
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm((f) => ({ ...f, newPassword: e.target.value }))}
                required
                className="mt-1 rounded-xl border-white/70 bg-white/80"
              />
            </div>
            <div>
              <Label htmlFor="confirm">Confirm new password</Label>
              <Input
                id="confirm"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) =>
                  setPasswordForm((f) => ({ ...f, confirmPassword: e.target.value }))
                }
                required
                className="mt-1 rounded-xl border-white/70 bg-white/80"
              />
            </div>
            {passwordError ? (
              <Alert variant="destructive">
                <AlertDescription>{passwordError}</AlertDescription>
              </Alert>
            ) : null}
            {passwordMsg ? (
              <p className="text-sm font-medium text-[#6ea43f]">{passwordMsg}</p>
            ) : null}
            <Button
              type="submit"
              disabled={savingPassword}
              className="rounded-xl bg-violet-600 text-white hover:bg-violet-700"
            >
              {savingPassword ? "Updating…" : "Change password"}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
