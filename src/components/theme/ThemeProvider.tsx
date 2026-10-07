"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type AppTheme = "dark" | "light";

const THEME_STORAGE_KEY = "codesight_visualization_theme";

type ThemeContextValue = {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(theme: AppTheme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>("dark");

  useEffect(() => {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    const initialTheme: AppTheme = saved === "light" || saved === "dark" ? saved : "dark";
    applyTheme(initialTheme);
    // Defer the React state sync so the effect only performs its external DOM
    // synchronization in the current render pass.
    Promise.resolve().then(() => setThemeState(initialTheme));
  }, []);

  const setTheme = useCallback((nextTheme: AppTheme) => {
    setThemeState(nextTheme);
    applyTheme(nextTheme);
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [setTheme, theme]);

  const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [setTheme, theme, toggleTheme]);
  // Keep a theme marker in the rendered tree as well as on <html>. This is
  // resilient to root-layout hot reloads and browser extensions that replace
  // the document class list, while `display: contents` preserves every
  // existing layout relationship.
  return (
    <ThemeContext.Provider value={value}>
      <div className={theme === "dark" ? "app-theme app-theme-dark" : "app-theme app-theme-light"}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used inside ThemeProvider");
  return value;
}
