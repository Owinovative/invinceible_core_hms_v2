"use client";

import * as React from "react";
import { Clock3, ShieldCheck } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";

type ShellStatusFooterProps = {
  label: string;
  scope?: string | null;
};

function formatClock(date: Date) {
  return new Intl.DateTimeFormat("en-KE", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

export function ShellStatusFooter({ label, scope }: ShellStatusFooterProps) {
  const { user } = useAuth();
  const [now, setNow] = React.useState(() => new Date());

  React.useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <footer className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 glass flex h-10 shrink-0 items-center justify-between gap-6 rounded-full border border-white/60 px-6 text-xs font-semibold text-sky-900 panel-shadow backdrop-blur-xl">
      <div className="flex min-w-0 items-center gap-2">
        <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
        <span className="truncate">{label}</span>
        {scope ? (
          <span className="hidden truncate text-sky-700/60 sm:inline">
            | {scope}
          </span>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-2 text-sky-800">
        <Clock3 className="h-4 w-4 text-cyan-600" />
        <span className="tracking-wide">{formatClock(now)}</span>
        <span className="hidden text-sky-700/60 md:inline">
          {user?.username ? `| ${user.username}` : ""}
        </span>
      </div>
    </footer>
  );
}
