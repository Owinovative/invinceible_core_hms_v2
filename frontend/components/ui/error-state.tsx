"use client";

import type { ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Meaningful error state for failed data loads: states what failed,
 * shows the server message when available, and offers retry.
 */
export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
  action,
  className,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center rounded-xl border border-destructive/25 bg-destructive-soft/50 px-6 py-10 text-center animate-enter",
        className,
      )}
    >
      <div
        aria-hidden
        className="flex size-12 items-center justify-center rounded-2xl bg-destructive-soft text-destructive"
      >
        <AlertTriangle className="size-6" />
      </div>
      <p className="mt-4 text-base font-semibold text-foreground">{title}</p>
      {message ? (
        <p className="mx-auto mt-1.5 max-w-md text-sm leading-6 text-muted-foreground">
          {message}
        </p>
      ) : null}
      <div className="mt-5 flex items-center gap-2">
        {onRetry ? (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RotateCcw data-icon="inline-start" /> Try again
          </Button>
        ) : null}
        {action}
      </div>
    </div>
  );
}
