"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Standard search field: leading icon, clear button, optional keyboard
 * hint. Pair with useDebouncedValue for server-driven filtering.
 */
export function SearchInput({
  value,
  onValueChange,
  placeholder = "Search…",
  shortcutHint,
  className,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "value" | "onChange"> & {
  value: string;
  onValueChange: (next: string) => void;
  shortcutHint?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        type="search"
        role="searchbox"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        placeholder={placeholder}
        className="pr-16 pl-9 [&::-webkit-search-cancel-button]:hidden"
        {...props}
      />
      <div className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-1">
        {value ? (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => onValueChange("")}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        ) : shortcutHint ? (
          <span className="kbd" aria-hidden>
            {shortcutHint}
          </span>
        ) : null}
      </div>
    </div>
  );
}
