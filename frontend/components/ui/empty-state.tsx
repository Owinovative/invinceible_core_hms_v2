import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border border-dashed border-sky-300 bg-sky-50/60 px-6 py-10 text-center",
        className,
      )}
    >
      <p className="text-base font-bold text-slate-950">{title}</p>
      {description ? (
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
