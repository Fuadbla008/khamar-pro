"use client";

import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Toaster } from "sonner";
import { LanguageProvider } from "./language-provider";
import { QueryProvider } from "./query-provider";

export function AppProviders({ children }) {
  return (
    <LanguageProvider>
      <NuqsAdapter>
        <QueryProvider>
          {children}
          <Toaster position="top-center" richColors closeButton duration={3500} />
        </QueryProvider>
      </NuqsAdapter>
    </LanguageProvider>
  );
}
