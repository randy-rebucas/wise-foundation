"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type WishlistButtonProps = {
  productId: string;
  variantId: string | null;
  slug: string;
  name: string;
  variantName?: string;
  sku: string;
  price: number;
  image?: string;
  className?: string;
};

export function WishlistButton({
  productId,
  variantId,
  slug,
  name,
  variantName,
  sku,
  price,
  image,
  className,
}: WishlistButtonProps) {
  const { data: session, status } = useSession();
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);

  const checkSaved = useCallback(async () => {
    if (status !== "authenticated" || session?.user?.role !== "CUSTOMER") {
      setChecked(true);
      return;
    }
    try {
      const res = await fetch("/api/account/wishlist");
      const json = await res.json();
      if (res.ok && json.success) {
        const items = json.data as { productId: string; variantId: string | null }[];
        setSaved(items.some((i) => i.productId === productId && i.variantId === variantId));
      }
    } finally {
      setChecked(true);
    }
  }, [status, session, productId, variantId]);

  useEffect(() => {
    queueMicrotask(() => {
      void checkSaved();
    });
  }, [checkSaved]);

  async function toggle() {
    setLoading(true);
    try {
      if (saved) {
        const params = new URLSearchParams({ productId });
        params.set("variantId", variantId ?? "null");
        const res = await fetch(`/api/account/wishlist?${params}`, { method: "DELETE" });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error);
        setSaved(false);
      } else {
        const res = await fetch("/api/account/wishlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId,
            variantId,
            slug,
            name,
            variantName,
            sku,
            price,
            image,
          }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error);
        setSaved(true);
      }
    } finally {
      setLoading(false);
    }
  }

  if (!checked) return null;

  if (status !== "authenticated" || session?.user?.role !== "CUSTOMER") return null;

  return (
    <Button
      type="button"
      variant="outline"
      className={cn("rounded-xl", className)}
      disabled={loading}
      onClick={() => void toggle()}
      aria-pressed={saved}
      aria-label={saved ? "Remove from wishlist" : "Add to wishlist"}
    >
      <Heart className={cn("h-4 w-4", saved ? "fill-pink-500 text-pink-500" : "")} />
    </Button>
  );
}
