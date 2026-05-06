"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { SidebarProvider } from "@/providers/sidebar-provider";
import { AuthProvider } from "@/providers/auth-provider";
import { ScopeProvider } from "@/providers/scope-provider";

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 10 * 60_000,
            refetchOnMount: true,
            refetchOnReconnect: true,
            refetchOnWindowFocus: false,
            placeholderData: (previousData: unknown) => previousData,
            retry: 1,
          },
          mutations: {
            retry: 0,
          },
        },
      }),
  );

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ScopeProvider>
            <SidebarProvider>{children}</SidebarProvider>
          </ScopeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
