"use client";

import { useEffect, useState } from "react";
import type { ProductReviewSummary } from "@/lib/services/marketplace.service";

export function useProductReviewSummaries(productIds: string[]) {
  const [summaries, setSummaries] = useState<Record<string, ProductReviewSummary>>({});
  const [loading, setLoading] = useState(false);
  const key = [...new Set(productIds.filter(Boolean))].sort().join(",");

  useEffect(() => {
    if (!key) {
      setSummaries({});
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        for (const id of key.split(",")) {
          params.append("productId", id);
        }
        const res = await fetch(`/api/marketplace/reviews/summaries?${params}`);
        const json = await res.json();
        if (!cancelled && json.success) {
          setSummaries(json.data ?? {});
        }
      } catch {
        if (!cancelled) setSummaries({});
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [key]);

  return { summaries, loading };
}
