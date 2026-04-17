"use client";

import { createContext, useContext } from "react";

interface TenantContextValue {
  tenantId: string;
  slug: string;
  tenantName: string;
  settings: {
    currency: string;
    timezone: string;
    memberDiscount: number;
    lowStockThreshold: number;
  };
}

const TenantContext = createContext<TenantContextValue | null>(null);

export function TenantProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: TenantContextValue;
}) {
  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant(): TenantContextValue {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error("useTenant must be used within TenantProvider");
  return ctx;
}
