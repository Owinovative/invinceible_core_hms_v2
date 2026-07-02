"use client";

import type { ReactNode } from "react";
import { FilterX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Toolbar for list screens: search + filter controls left, actions right,
 * with active-filter chips and one-click reset.
 */
export function FilterBar({
  children,
  actions,
  activeFilters,
  onClearFilters,
  className,
}: {
  children?: ReactNode;
  actions?: ReactNode;
  activeFilters?: Array<{ key: string; label: string; onRemove?: () => void }>;
  onClearFilters?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-3 shadow-xs",
        className,
      )}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {children}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        ) : null}
      </div>
      {activeFilters?.length ? (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border pt-3">
          <span className="text-xs text-muted-foreground">Filters:</span>
          {activeFilters.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={filter.onRemove}
              className="inline-flex items-center gap-1 rounded-full border border-module/30 bg-module-soft px-2.5 py-0.5 text-xs font-medium text-module transition-colors hover:border-module/60 focus-visible:outline-2 focus-visible:outline-ring"
            >
              {filter.label}
              {filter.onRemove ? <span aria-hidden>×</span> : null}
            </button>
          ))}
          {onClearFilters ? (
            <Button
              variant="ghost"
              size="xs"
              onClick={onClearFilters}
              className="ml-auto text-muted-foreground"
            >
              <FilterX data-icon="inline-start" /> Clear all
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
