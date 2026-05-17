"use client";

import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { hasPermission, isPlatformAdmin } from "@/lib/permissions";
import type { UserRole } from "@/types";

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requiredPermissions?: string[];
  fallback?: React.ReactNode;
}

export function RoleGuard({
  children,
  allowedRoles,
  requiredPermissions,
  fallback = null,
}: RoleGuardProps) {
  const { data: session, status } = useSession();
  const user = session?.user;

  if (status === "loading") {
    return (
      <div className="flex justify-center py-16" aria-busy="true">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return <>{fallback}</>;

  if (isPlatformAdmin(user.role)) return <>{children}</>;

  if (allowedRoles && !allowedRoles.includes(user.role as UserRole)) {
    return <>{fallback}</>;
  }

  if (requiredPermissions && !hasPermission(user, ...requiredPermissions)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
