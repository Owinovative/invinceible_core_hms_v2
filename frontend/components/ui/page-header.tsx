import type { ReactNode } from "react";
import { Breadcrumbs, type Crumb } from "@/components/ui/breadcrumbs";
import { cn } from "@/lib/utils";

/**
 * Module page header: breadcrumbs, module-accent eyebrow, display title,
 * and an actions rail. Sits on the canvas (no boxed band) for an open,
 * premium hierarchy.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  breadcrumbs,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumbs?: Crumb[];
  className?: string;
}) {
  return (
    <header className={cn("flex flex-col gap-3 animate-enter", className)}>
      {breadcrumbs?.length ? <Breadcrumbs items={breadcrumbs} /> : null}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="flex items-center gap-2 text-xs font-semibold tracking-widest text-module uppercase">
              <span
                aria-hidden
                className="inline-block h-3.5 w-1 rounded-full bg-module"
              />
              {eyebrow}
            </p>
          ) : null}
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-foreground md:text-[1.75rem]">
            {title}
          </h1>
          {description ? (
            <p className="mt-1.5 max-w-3xl text-sm leading-6 text-muted-foreground">
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
    </header>
  );
}
