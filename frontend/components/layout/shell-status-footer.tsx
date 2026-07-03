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
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/**
 * Slim status strip anchoring the shell: system identity, active scope,
 * live clock, and signed-in operator. Updates once a minute.
 */
export function ShellStatusFooter({ label, scope }: ShellStatusFooterProps) {
  const { user } = useAuth();
  const [now, setNow] = React.useState<Date | null>(null);

  React.useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <footer className="flex h-8 shrink-0 items-center gap-4 border-t border-border bg-surface-1 px-4 text-xs text-muted-foreground">
      <span className="flex min-w-0 items-center gap-1.5">
        <ShieldCheck className="size-3.5 shrink-0 text-success" aria-hidden />
        <span className="truncate">{label}</span>
      </span>
      {scope ? (
        <span className="hidden min-w-0 truncate border-l border-border pl-4 sm:block">
          {scope}
        </span>
      ) : null}
      <span className="tabular ml-auto flex shrink-0 items-center gap-1.5">
        <Clock3 className="size-3.5 text-module" aria-hidden />
        {now ? formatClock(now) : "—"}
        {user?.username ? (
          <span className="hidden border-l border-border pl-3 md:inline">
            {user.username}
          </span>
        ) : null}
      </span>
    </footer>
  );
}
