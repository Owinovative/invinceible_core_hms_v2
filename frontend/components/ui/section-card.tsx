import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Content section: layered card with an optional header rail. The
 * spotlight variant carries the module-accent hairline.
 */
export function SectionCard({
  title,
  description,
  actions,
  children,
  variant = "default",
  className,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  variant?: "default" | "spotlight" | "soft";
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-xl",
        variant === "spotlight"
          ? "surface-spotlight"
          : variant === "soft"
            ? "border border-border bg-surface-2/60"
            : "border border-border bg-card shadow-xs",
        className,
      )}
    >
      {title || description || actions ? (
        <div className="flex flex-col gap-3 border-b border-border px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            {title ? (
              <h2 className="text-sm font-semibold tracking-tight text-foreground">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="mt-0.5 text-sm leading-6 text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          {actions ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {actions}
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="p-5">{children}</div>
    </section>
  );
}
