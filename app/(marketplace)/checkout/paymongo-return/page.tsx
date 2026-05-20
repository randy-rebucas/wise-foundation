import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { PaymongoReturnClient } from "./PaymongoReturnClient";

function PaymongoReturnFallback() {
  return (
    <div className="-mx-4 -my-8 flex min-h-[50vh] items-center justify-center px-4 py-16 font-[family-name:var(--font-plus-jakarta-sans)] text-[#2A4C6A]">
      <div className="flex flex-col items-center gap-3 text-center">
        <Loader2 className="h-10 w-10 animate-spin text-[#6ea43f]" />
        <p className="text-sm font-medium text-[#1e3157]">Confirming your payment…</p>
      </div>
    </div>
  );
}

export default function PaymongoReturnPage() {
  return (
    <Suspense fallback={<PaymongoReturnFallback />}>
      <PaymongoReturnClient />
    </Suspense>
  );
}
