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

export function SidebarProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const toggleSidebar = React.useCallback(() => {
    setCollapsed((prev) => !prev);
  }, []);

  const openMobileSidebar = React.useCallback(() => {
    setMobileOpen(true);
  }, []);

  const closeMobileSidebar = React.useCallback(() => {
    setMobileOpen(false);
  }, []);

  return (
    <SidebarContext.Provider
      value={{
        collapsed,
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
