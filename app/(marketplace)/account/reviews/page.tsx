"use client";

import Link from "next/link";
import { MessageCircle, Star } from "lucide-react";
import { AccountPageHeader } from "@/components/marketplace/account/AccountPageHeader";
import { Button } from "@/components/ui/button";

export default function AccountReviewsPage() {
  return (
    <>
      <AccountPageHeader
        title="My Reviews"
        description="Reviews you've shared about Glowish products."
      />

      <div className="mt-8 rounded-2xl border border-white/65 bg-white/60 p-10 text-center shadow-sm">
        <MessageCircle className="mx-auto h-10 w-10 text-violet-400" />
        <p className="mt-4 text-sm text-[#2A4C6A]/75">
          You haven&apos;t written any reviews yet. After you receive an order, share your
          experience to help other shoppers.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild className="rounded-xl bg-[#6ea43f] text-white hover:bg-[#5d9235]">
            <Link href="/shop">Shop products</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-xl border-white/70 bg-white/65">
            <Link href="/reviews">
              <Star className="mr-2 h-4 w-4" />
              Read community reviews
            </Link>
          </Button>
        </div>
      </div>
    </>
  );
}
