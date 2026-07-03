import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Domain status chip with a semantic dot. Token-driven — correct in both
 * themes. Tones map to the shared status palette.
 */
const toneClass: Record<string, string> = {
  neutral: "border-border bg-surface-2 text-muted-foreground",
  success: "border-success/25 bg-success-soft text-success",
  warning: "border-warning/30 bg-warning-soft text-warning",
  danger: "border-destructive/25 bg-destructive-soft text-destructive",
  info: "border-info/25 bg-info-soft text-info",
};

const dotClass: Record<string, string> = {
  neutral: "bg-muted-foreground/60",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
  info: "bg-info",
};

export function StatusBadge({
  children,
  tone = "neutral",
  withDot = true,
  className,
}: {
  children: ReactNode;
  tone?: keyof typeof toneClass;
  withDot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[0.7rem] font-semibold tracking-wide uppercase",
        toneClass[tone] ?? toneClass.neutral,
        className,
      )}
    >
      {withDot ? (
        <span
          aria-hidden
          className={cn(
            "size-1.5 shrink-0 rounded-full",
            dotClass[tone] ?? dotClass.neutral,
          )}
        />
      ) : null}
      {children}
    </span>
  );
}
