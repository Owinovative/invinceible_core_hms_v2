"use client";

import * as React from "react";

type SidebarContextValue = {
  collapsed: boolean;
  mobileOpen: boolean;
  toggleSidebar: () => void;
  setCollapsed: (value: boolean) => void;
  setMobileOpen: (value: boolean) => void;
  openMobileSidebar: () => void;
  closeMobileSidebar: () => void;
};

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

const STORAGE_KEY = "meridian:sidebar:collapsed";

export function SidebarProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  // Track whether we've hydrated so the sidebar width animates only after mount
  const [mounted, setMounted] = React.useState(false);

  // Restore persisted state before first paint
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        setCollapsed(stored === "true");
      }
    } catch {}
    setMounted(true);
  }, []);

  const toggleSidebar = React.useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {}
      return next;
    });
  }, []);

  // Keyboard shortcut: Ctrl+B to toggle sidebar (matches VS Code / Linear)
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "b") {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggleSidebar]);

  const openMobileSidebar = React.useCallback(() => {
    setMobileOpen(true);
  }, []);

  const closeMobileSidebar = React.useCallback(() => {
    setMobileOpen(false);
  }, []);

  return (
    <SidebarContext.Provider
      value={{
        collapsed: mounted ? collapsed : false, // avoid hydration mismatch
        mobileOpen,
        toggleSidebar,
        setCollapsed,
        setMobileOpen,
        openMobileSidebar,
        closeMobileSidebar,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = React.useContext(SidebarContext);

  if (!context) {
    throw new Error("useSidebar must be used within SidebarProvider");
  }

  return context;
}
