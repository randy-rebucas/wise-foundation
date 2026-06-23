"use client";

import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { ConfirmProvider } from "@/components/providers/confirm-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <SessionProvider basePath="/api/auth" refetchOnWindowFocus={false}>
      <QueryClientProvider client={queryClient}>
        <ConfirmProvider>
          {children}
          <Toaster />
        </ConfirmProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
