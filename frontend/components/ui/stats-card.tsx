import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function StatsCard({
  label,
  value,
  detail,
  icon,
  className,
}: {
  label: string;
  value: ReactNode;
  detail?: string;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border border-sky-200 bg-white p-4 shadow-sm shadow-sky-900/5",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-sky-700">
            {label}
          </p>
          <div className="mt-2 text-2xl font-black text-slate-950">{value}</div>
        </div>
        {icon ? (
          <div className="flex h-10 w-10 items-center justify-center bg-sky-50 text-sky-700">
            {icon}
          </div>
        ) : null}
      </div>
      {detail ? <p className="mt-3 text-sm leading-6 text-slate-600">{detail}</p> : null}
    </div>
  );
}
