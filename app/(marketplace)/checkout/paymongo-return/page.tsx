import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { MarketplacePageShell } from "@/components/marketplace/MarketplacePageShell";
import { PaymongoReturnClient } from "./PaymongoReturnClient";

function PaymongoReturnFallback() {
  return (
    <MarketplacePageShell gap="" innerClassName="flex min-h-[50vh] items-center justify-center py-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <Loader2 className="h-10 w-10 animate-spin text-[#6ea43f]" />
        <p className="text-sm font-medium text-[#1e3157]">Confirming your payment…</p>
      </div>
    </MarketplacePageShell>
  );
}

export default function PaymongoReturnPage() {
  return (
    <Suspense fallback={<PaymongoReturnFallback />}>
      <PaymongoReturnClient />
    </Suspense>
  );
}
