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
  glowClassName,
  isLoading = false,
}: MetricCardProps) {
  return (
    <Card className="group relative overflow-hidden rounded-[1.8rem] gradient-border panel-shadow transition-all duration-300 hover:-translate-y-1.5">
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-500/10 via-cyan-500/5 to-transparent",
          glowClassName,
        )}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      <CardHeader className="relative flex flex-row items-start justify-between space-y-0 pb-4">
        <div className="space-y-3">
          <CardTitle className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {title}
          </CardTitle>

          {isLoading ? (
            <Skeleton className="h-10 w-28 rounded-xl" />
          ) : (
            <div className="flex items-end gap-2">
              <div className="text-4xl font-bold tracking-tight">{value}</div>
              <ArrowUpRight className="mb-1 h-4 w-4 text-cyan-400 opacity-70 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          )}
        </div>

        <div className="flex h-14 w-14 items-center justify-center rounded-[1.35rem] border border-white/10 bg-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </CardHeader>

      <CardContent className="relative flex items-end justify-between gap-4 pt-0">
        {isLoading ? (
          <>
            <div className="space-y-2">
              <Skeleton className="h-4 w-36 rounded-lg" />
              <Skeleton className="h-3 w-24 rounded-lg" />
            </div>
            <Skeleton className="h-7 w-20 rounded-full" />
          </>
        ) : (
          <>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{subtitle}</p>
              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/[0.06]">
                <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-cyan-400/70 to-blue-500/70" />
              </div>
            </div>

            <span
              className={cn(
                "shrink-0 rounded-full border border-white/10 px-3 py-1 text-xs font-semibold shadow-sm",
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
