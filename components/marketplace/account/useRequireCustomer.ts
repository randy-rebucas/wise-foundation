"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { getStaffHomePath } from "@/lib/navigation/staffHome";

const ACCOUNT_ROLES = ["CUSTOMER", "MEMBER"] as const;

export function useRequireCustomer() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (
      status === "authenticated" &&
      session?.user?.role !== undefined &&
      !(ACCOUNT_ROLES as readonly string[]).includes(session.user.role)
    ) {
      router.replace(getStaffHomePath(session.user));
    }
  }, [status, session, router]);

  const role = session?.user?.role;
  const ready = status === "authenticated" && (ACCOUNT_ROLES as readonly string[]).includes(role ?? "");
  const isGuest = status === "unauthenticated";

  return {
    session,
    status,
    ready,
    isGuest,
    user: ready ? session!.user : null,
  };
}
