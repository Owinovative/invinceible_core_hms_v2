import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export type StatTrend = {
  /** Already-formatted delta (e.g. "+12.4%"). */
  label: string;
  direction: "up" | "down" | "flat";
  /** Whether "up" is good (revenue) or bad (wait time). Default good. */
  upIsGood?: boolean;
};

/**
 * KPI / stat card in the Meridian spotlight style: module-accent
 * hairline, icon tile, tabular numerals, optional trend delta.
 */
export function StatsCard({
  label,
  value,
  detail,
  icon,
  trend,
  className,
}: {
  label: string;
  value: ReactNode;
  detail?: string;
  icon?: ReactNode;
  trend?: StatTrend;
  className?: string;
}) {
  const positive =
    trend &&
    ((trend.direction === "up" && trend.upIsGood !== false) ||
      (trend.direction === "down" && trend.upIsGood === false));

  return (
    <div className={cn("surface-spotlight rounded-xl p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          {label}
        </p>
        {icon ? (
          <div
            aria-hidden
            className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-module-soft text-module [&_svg]:size-5"
          >
            {icon}
          </div>
        ) : null}
      </div>
      <div className="tabular mt-2 text-3xl font-bold tracking-tight text-foreground">
        {value}
      </div>
      {trend || detail ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {trend ? (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold",
                trend.direction === "flat"
                  ? "bg-surface-2 text-muted-foreground"
                  : positive
                    ? "bg-success-soft text-success"
                    : "bg-destructive-soft text-destructive",
              )}
            >
              {trend.direction === "up" ? (
                <ArrowUpRight className="size-3" aria-hidden />
              ) : trend.direction === "down" ? (
                <ArrowDownRight className="size-3" aria-hidden />
              ) : (
                <Minus className="size-3" aria-hidden />
              )}
              {trend.label}
            </span>
          ) : null}
          {detail ? (
            <p className="text-sm text-muted-foreground">{detail}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
