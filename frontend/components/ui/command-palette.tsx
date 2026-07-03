"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Dialog as DialogPrimitive } from "radix-ui";
import { ArrowRight, Search } from "lucide-react";
import {
  quickActions,
  visibleNavSections,
  type NavItem,
} from "@/lib/navigation";
import { useAuth } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";

type PaletteEntry = NavItem & { group: string };

function matches(entry: PaletteEntry, query: string): boolean {
  const haystack = [entry.title, entry.group, ...(entry.keywords ?? [])]
    .join(" ")
    .toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .every((word) => haystack.includes(word));
}

/**
 * Global ⌘K / Ctrl+K command palette: keyboard-first navigation across
 * every module and quick action the signed-in role can access.
 */
export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const [query, setQuery] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(0);
  const listRef = React.useRef<HTMLDivElement>(null);

  const entries = React.useMemo<PaletteEntry[]>(() => {
    const sections = visibleNavSections(user?.roleCode ?? "");
    return [
      ...quickActions.map((action) => ({ ...action, group: "Quick actions" })),
      ...sections.flatMap((section) =>
        section.items.map((item) => ({ ...item, group: section.label })),
      ),
    ];
  }, [user?.roleCode]);

  const results = React.useMemo(
    () => (query.trim() ? entries.filter((e) => matches(e, query)) : entries),
    [entries, query],
  );

  React.useEffect(() => {
    setActiveIndex(0);
  }, [query, open]);

  React.useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const go = React.useCallback(
    (entry: PaletteEntry | undefined) => {
      if (!entry) return;
      onOpenChange(false);
      router.push(entry.href);
    },
    [onOpenChange, router],
  );

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      go(results[activeIndex]);
    }
  };

  React.useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  let flatIndex = -1;
  const grouped = new Map<string, Array<PaletteEntry & { index: number }>>();
  for (const entry of results) {
    flatIndex += 1;
    const list = grouped.get(entry.group) ?? [];
    list.push({ ...entry, index: flatIndex });
    grouped.set(entry.group, list);
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-0 bg-black/45 backdrop-blur-[2px] data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
          style={{ zIndex: "var(--z-modal)" }}
        />
        <DialogPrimitive.Content
          aria-label="Command palette"
          onKeyDown={onKeyDown}
          className="fixed top-[12vh] left-1/2 w-[min(40rem,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-xl data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0"
          style={{ zIndex: "var(--z-modal)" }}
        >
          <DialogPrimitive.Title className="sr-only">
            Search and jump anywhere
          </DialogPrimitive.Title>
          <div className="flex items-center gap-2.5 border-b border-border px-4">
            <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Jump to a module, patient list, action…"
              className="h-13 w-full bg-transparent text-[0.95rem] outline-none placeholder:text-muted-foreground"
              aria-label="Search destinations"
            />
            <span className="kbd shrink-0" aria-hidden>esc</span>
          </div>
          <div
            ref={listRef}
            role="listbox"
            aria-label="Results"
            className="max-h-[50vh] overflow-y-auto p-2"
          >
            {results.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                No matches for “{query}”.
              </p>
            ) : (
              [...grouped.entries()].map(([group, items]) => (
                <div key={group} className="mb-1">
                  <p className="px-3 pt-2 pb-1 text-[0.68rem] font-semibold tracking-widest text-muted-foreground uppercase">
                    {group}
                  </p>
                  {items.map((entry) => {
                    const Icon = entry.icon;
                    const active = entry.index === activeIndex;
                    return (
                      <button
                        key={`${entry.href}-${entry.index}`}
                        type="button"
                        role="option"
                        aria-selected={active}
                        data-index={entry.index}
                        onMouseEnter={() => setActiveIndex(entry.index)}
                        onClick={() => go(entry)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                          active
                            ? "bg-module-soft text-foreground"
                            : "text-muted-foreground hover:bg-muted",
                        )}
                      >
                        <Icon
                          className={cn(
                            "size-4 shrink-0",
                            active ? "text-module" : "opacity-70",
                          )}
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1 truncate font-medium">
                          {entry.title}
                        </span>
                        {active ? (
                          <ArrowRight
                            className="size-3.5 shrink-0 text-module"
                            aria-hidden
                          />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
          <div className="flex items-center gap-3 border-t border-border bg-surface-2/60 px-4 py-2 text-[0.7rem] text-muted-foreground">
            <span><span className="kbd">↑↓</span> navigate</span>
            <span><span className="kbd">↵</span> open</span>
            <span className="ml-auto">Invinceible Core HMS</span>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/** Global hotkey hook: opens the palette on ⌘K / Ctrl+K. */
export function useCommandPalette() {
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return { open, setOpen };
}
