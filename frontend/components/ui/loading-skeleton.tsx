import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Structural skeleton presets. Each mirrors the layout it stands in for,
 * so content arrival causes no layout shift. All are aria-hidden with a
 * polite busy wrapper for screen readers.
 */

function Busy({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label={label}
      className={className}
    >
      {children}
      <span className="sr-only">{label}</span>
    </div>
  );
}

/** Table stand-in: header bar + N aligned rows. */
export function LoadingSkeleton({
  rows = 5,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return <SkeletonTable rows={rows} className={className} />;
}

export function SkeletonTable({
  rows = 5,
  columns = 4,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <Busy
      label="Loading table"
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-card",
        className,
      )}
    >
      <div className="flex gap-3 border-b border-border bg-surface-2/70 px-4 py-3">
        {Array.from({ length: columns }).map((_, column) => (
          <Skeleton
            key={column}
            className={cn("h-3.5", column === 0 ? "w-2/5" : "flex-1")}
          />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, row) => (
        <div
          key={row}
          className="flex items-center gap-3 border-b border-border px-4 py-3.5 last:border-0"
        >
          {Array.from({ length: columns }).map((_, column) => (
            <Skeleton
              key={column}
              className={cn("h-4", column === 0 ? "w-2/5" : "flex-1")}
            />
          ))}
        </div>
      ))}
    </Busy>
  );
}

/** KPI/stat card row stand-in. */
export function SkeletonStats({
  count = 4,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <Busy
      label="Loading statistics"
      className={cn(
        "grid gap-4 sm:grid-cols-2 xl:grid-cols-4",
        className,
      )}
    >
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="rounded-xl border border-border bg-card p-5"
        >
          <div className="flex items-start justify-between gap-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="size-10 rounded-lg" />
          </div>
          <Skeleton className="mt-3 h-8 w-28" />
          <Skeleton className="mt-3 h-3.5 w-32" />
        </div>
      ))}
    </Busy>
  );
}

/** Card grid stand-in. */
export function SkeletonCards({
  count = 6,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <Busy
      label="Loading content"
      className={cn("grid gap-4 sm:grid-cols-2 xl:grid-cols-3", className)}
    >
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="rounded-xl border border-border bg-card p-5"
        >
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="mt-3 h-3.5 w-full" />
          <Skeleton className="mt-2 h-3.5 w-4/5" />
          <div className="mt-4 flex gap-2">
            <Skeleton className="h-7 w-20 rounded-lg" />
            <Skeleton className="h-7 w-14 rounded-lg" />
          </div>
        </div>
      ))}
    </Busy>
  );
}

/** Form stand-in: labeled field pairs. */
export function SkeletonForm({
  fields = 6,
  className,
}: {
  fields?: number;
  className?: string;
}) {
  return (
    <Busy
      label="Loading form"
      className={cn("grid gap-5 md:grid-cols-2", className)}
    >
      {Array.from({ length: fields }).map((_, index) => (
        <div key={index} className="space-y-2">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      ))}
    </Busy>
  );
}

/** Whole-page stand-in used by route loading.tsx: header + stats + table. */
export function SkeletonPage({ className }: { className?: string }) {
  return (
    <Busy label="Loading page" className={cn("space-y-6", className)}>
      <div className="space-y-3">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <SkeletonStats />
      <SkeletonTable rows={6} />
    </Busy>
  );
}
