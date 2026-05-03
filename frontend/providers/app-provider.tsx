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
            staleTime: 15_000,
            gcTime: 5 * 60_000,
            refetchInterval: 45_000,
            refetchIntervalInBackground: false,
            refetchOnMount: true,
            refetchOnReconnect: true,
            refetchOnWindowFocus: true,
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
