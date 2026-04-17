"use client";

import { useSession } from "next-auth/react";
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
  const { data: session } = useSession();
  const user = session?.user;

  if (!user) return <>{fallback}</>;

  if (user.role === "SUPER_ADMIN") return <>{children}</>;

  if (allowedRoles && !allowedRoles.includes(user.role as UserRole)) {
    return <>{fallback}</>;
  }

  if (requiredPermissions) {
    const hasAll = requiredPermissions.every((p) => user.permissions?.includes(p));
    if (!hasAll) return <>{fallback}</>;
  }

  return <>{children}</>;
}
