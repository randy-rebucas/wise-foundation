"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export function useRequireCustomer() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/account/login");
    } else if (status === "authenticated" && session?.user?.role !== "CUSTOMER") {
      router.replace("/dashboard");
    }
  }, [status, session, router]);

  const ready = status === "authenticated" && session?.user?.role === "CUSTOMER";

  return {
    session,
    status,
    ready,
    user: ready ? session.user : null,
  };
}
