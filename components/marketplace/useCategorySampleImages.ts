"use client";

import { useEffect, useState } from "react";
import type { MarketplaceCategoryShowcase } from "@/lib/services/marketplace.service";

export function useCategorySampleImages() {
  const [samples, setSamples] = useState<MarketplaceCategoryShowcase | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/marketplace/category-images");
        const json = await res.json();
        if (!cancelled && json.success) {
          setSamples(json.data ?? null);
        }
      } catch {
        /* optional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return samples;
}
