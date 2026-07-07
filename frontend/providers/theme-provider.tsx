"use client";

import * as React from "react";

/**
 * Stub theme provider — application uses a single polished light theme.
 * Dark mode has been removed. This file is retained for compatibility
 * with any import that still references ThemeProvider / useTheme.
 */

type ThemeContextValue = {
  preference: "light";
  resolved: "light";
  setPreference: () => void;
  toggle: () => void;
};

const ThemeContext = React.createContext<ThemeContextValue>({
  preference: "light",
  resolved: "light",
  setPreference: () => {},
  toggle: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeContext.Provider
      value={{ preference: "light", resolved: "light", setPreference: () => {}, toggle: () => {} }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return React.useContext(ThemeContext);
}

/** No-op — dark mode removed. Retained for compatibility. */
export const themeInitScript = "";
