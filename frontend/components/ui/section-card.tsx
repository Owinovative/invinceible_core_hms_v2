import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SectionCard({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "border border-sky-200 bg-white shadow-sm shadow-sky-900/5",
        className,
      )}
    >
      {title || description || actions ? (
        <div className="flex flex-col gap-3 border-b border-sky-100 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            {title ? (
              <h2 className="text-base font-bold text-slate-950">{title}</h2>
            ) : null}
            {description ? (
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {description}
              </p>
            ) : null}
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div className="p-5">{children}</div>
    </section>
  );
}
