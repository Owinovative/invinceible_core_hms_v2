import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Sophisticated empty state: soft icon medallion, clear guidance, and a
 * primary action slot. Never a blank void.
 */
export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-xl border border-dashed border-border-strong bg-surface-2/50 px-6 py-12 text-center",
        className,
      )}
    >
      <div
        aria-hidden
        className="flex size-14 items-center justify-center rounded-2xl bg-module-soft text-module shadow-xs [&_svg]:size-7"
      >
        {icon ?? <Inbox />}
      </div>
      <p className="mt-4 text-base font-semibold text-foreground">{title}</p>
      {description ? (
        <p className="mx-auto mt-1.5 max-w-md text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
