import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: LucideIcon;
  chip: string;
  chipClassName?: string;
  glowClassName?: string;
  isLoading?: boolean;
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  chip,
  chipClassName,
  isLoading = false,
}: MetricCardProps) {
  return (
    <Card className="group relative overflow-hidden rounded-lg border-border bg-card shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md">
      <CardHeader className="relative flex flex-row items-start justify-between space-y-0 pb-4">
        <div className="space-y-3">
          <CardTitle className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {title}
          </CardTitle>

          {isLoading ? (
            <Skeleton className="h-10 w-28 rounded-md" />
          ) : (
            <div className="flex items-end gap-2">
              <div className="text-4xl font-bold tracking-tight text-module">{value}</div>
              <ArrowUpRight className="mb-1 h-4 w-4 text-module opacity-80 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          )}
        </div>

        <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-border bg-surface-2">
          <Icon className="h-5 w-5 text-module" />
        </div>
      </CardHeader>

      <CardContent className="relative flex items-end justify-between gap-4 pt-0">
        {isLoading ? (
          <>
            <div className="space-y-2">
              <Skeleton className="h-4 w-36 rounded-md" />
              <Skeleton className="h-3 w-24 rounded-md" />
            </div>
            <Skeleton className="h-7 w-20 rounded-md" />
          </>
        ) : (
          <>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{subtitle}</p>
              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-accent">
                <div className="h-full w-3/4 rounded-full bg-primary" />
              </div>
            </div>

            <span
              className={cn(
                "shrink-0 rounded-md border border-border px-3 py-1 text-xs font-semibold shadow-sm",
                chipClassName,
              )}
            >
              {chip}
            </span>
          </>
        )}
      </CardContent>
    </Card>
  );
}
