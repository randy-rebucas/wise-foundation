"use client";

import { useCallback } from "react";
import { useSession } from "next-auth/react";
import { useTenant } from "@/components/providers/TenantProvider";

/**
 * Returns a `fetch`-compatible function that automatically injects
 * `x-tenant-id` when a SUPER_ADMIN is browsing a tenant whose ID differs
 * from the one baked into their JWT.
 *
 * For all other roles the returned function is identical to the native fetch.
 */
export function useTenantFetch() {
  const { tenantId } = useTenant();
  const { data: session } = useSession();

  const isCrossTenant =
    session?.user?.role === "SUPER_ADMIN" &&
    !!tenantId &&
    session.user.tenantId !== tenantId;

  return useCallback(
    (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      if (!isCrossTenant) return fetch(input, init);

      const headers = new Headers(init?.headers);
      headers.set("x-tenant-id", tenantId);
      headers.set("Content-Type", headers.get("Content-Type") ?? "application/json");
      return fetch(input, { ...init, headers });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isCrossTenant, tenantId]
  );
}
