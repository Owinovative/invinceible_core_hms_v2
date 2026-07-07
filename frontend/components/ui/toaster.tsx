"use client";

import { Toaster as SonnerToaster } from "sonner";

/**
 * App-wide toast host (sonner), always light themed.
 * Use `import { toast } from "sonner"` anywhere:
 *   toast.success("Payment recorded")
 *   toast.error("M-PESA prompt failed", { description: message })
 */
export function Toaster() {
  return (
    <SonnerToaster
      theme="light"
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
