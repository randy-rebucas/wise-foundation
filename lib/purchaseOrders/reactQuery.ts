/** PO screens always fetch fresh data (pricing, lines, status). */
export const purchaseOrderFreshQueryOptions = {
  staleTime: 0,
  gcTime: 60_000,
  refetchOnMount: "always" as const,
  refetchOnWindowFocus: true,
} as const;

export const purchaseOrderQueryKeys = {
  list: "purchase-orders",
  detail: "purchase-order",
  products: "products-simple",
  organizations: "organizations-for-purchase-orders",
} as const;

/** Avoid browser/CDN caching for PO and catalog pricing requests. */
export const purchaseOrderFetchInit: RequestInit = { cache: "no-store" };
