import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type TimelineTone = "neutral" | "success" | "warning" | "danger" | "info";

const toneDot: Record<TimelineTone, string> = {
  neutral: "bg-muted-foreground/50 ring-surface-2",
  success: "bg-success ring-success-soft",
  warning: "bg-warning ring-warning-soft",
  danger: "bg-destructive ring-destructive-soft",
  info: "bg-info ring-info-soft",
};

/**
 * Vertical activity/audit timeline (payments, claim progress, clinical
 * events). Semantic list markup for screen readers.
 */
export function Timeline({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <ol className={cn("space-y-0", className)}>{children}</ol>;
}

export function TimelineItem({
  title,
  timestamp,
  description,
  tone = "neutral",
  icon,
  last = false,
  children,
}: {
  title: ReactNode;
  timestamp?: string;
  description?: ReactNode;
  tone?: TimelineTone;
  icon?: ReactNode;
  last?: boolean;
  children?: ReactNode;
}) {
  return (
    <li className="relative flex gap-3 pb-6 last:pb-0">
      {!last ? (
        <span
          aria-hidden
          className="absolute top-6 left-[0.5625rem] h-full w-px bg-border"
        />
      ) : null}
      <span
        aria-hidden
        className={cn(
          "relative mt-1 flex size-[1.15rem] shrink-0 items-center justify-center rounded-full ring-4",
          toneDot[tone],
          icon && "bg-transparent ring-0",
        )}
      >
        {icon ?? <span className="size-2 rounded-full bg-current opacity-0" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          <p className="text-sm font-medium text-foreground">{title}</p>
          {timestamp ? (
            <time className="tabular text-xs text-muted-foreground">
              {timestamp}
            </time>
          ) : null}
        </div>
        {description ? (
          <p className="mt-0.5 text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        ) : null}
        {children}
      </div>
    </li>
  );
}
