"use client";

import { NuqsAdapter } from "nuqs/adapters/next/app";
import { QueryProvider } from "./query-provider";

export function AppProviders({ children }) {
  return (
    <NuqsAdapter>
      <QueryProvider>{children}</QueryProvider>
    </NuqsAdapter>
  );
}
