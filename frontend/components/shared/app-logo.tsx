"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type AppLogoProps = {
  className?: string;
  iconOnly?: boolean;
  light?: boolean;
};

export function AppLogo({
  className,
  iconOnly = false,
  light = false,
}: AppLogoProps) {
  const [hasError, setHasError] = React.useState(false);

  const textMainClass = light ? "text-white" : "text-foreground";
  const textSubClass = light ? "text-white/70" : "text-muted-foreground";

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className={cn(
          "relative flex items-center justify-center overflow-hidden rounded-2xl",
          iconOnly ? "h-12 w-12" : "h-14 w-14",
          light ? "bg-card/10" : "bg-card",
        )}
      >
        {!hasError ? (
          <img
            src="/brand/logo-icon.png"
            alt="Invinceible Core HMS"
            className="h-full w-full object-contain"
            onError={() => setHasError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-primary text-white text-sm font-bold">
            IC
          </div>
        )}
      </div>

      {!iconOnly && (
        <div className="min-w-0">
          <p className={cn("truncate text-lg font-bold tracking-tight", textMainClass)}>
            Invinceible Core
          </p>
          <p className={cn("truncate text-xs uppercase tracking-[0.2em]", textSubClass)}>
            HMS
          </p>
        </div>
      )}
    </div>
  );
}
