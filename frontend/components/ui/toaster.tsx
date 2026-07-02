"use client";

import { Toaster as SonnerToaster } from "sonner";
import { useTheme } from "@/providers/theme-provider";

/**
 * App-wide toast host (sonner), themed with design tokens and following
 * the active color scheme. Use `import { toast } from "sonner"` anywhere:
 *   toast.success("Payment recorded")
 *   toast.error("M-PESA prompt failed", { description: message })
 */
export function Toaster() {
  const { resolved } = useTheme();

  return (
    <SonnerToaster
      theme={resolved}
      position="top-right"
      closeButton
      richColors
      toastOptions={{
        style: {
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-lg)",
          background: "var(--popover)",
          color: "var(--popover-foreground)",
        },
      }}
    />
  );
}
