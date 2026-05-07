import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const toneClass = {
  neutral: "border-slate-300 bg-slate-50 text-slate-700",
  success: "border-emerald-300 bg-emerald-50 text-emerald-800",
  warning: "border-amber-300 bg-amber-50 text-amber-800",
  danger: "border-red-300 bg-red-50 text-red-800",
  info: "border-sky-300 bg-sky-50 text-sky-800",
};

export function StatusBadge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: keyof typeof toneClass;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center border px-2.5 py-1 text-xs font-bold uppercase tracking-wide",
        toneClass[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
