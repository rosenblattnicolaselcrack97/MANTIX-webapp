"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  getResolvedSystemTheme,
  isThemeMode,
  resolveTheme,
  themeStorageKey,
  type ResolvedTheme,
  type ThemeMode,
} from "@/lib/theme";

interface ThemeContextValue {
  theme: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getThemeFromDom(): ThemeMode {
  if (typeof document === "undefined") {
    return "system";
  }

  const themeMode = document.documentElement.dataset.themeMode;
  return isThemeMode(themeMode) ? themeMode : "system";
}

function getResolvedThemeFromDom(): ResolvedTheme {
  if (typeof document === "undefined") {
    return "light";
  }

  const currentTheme = document.documentElement.dataset.theme;
  return currentTheme === "dark" ? "dark" : "light";
}

function applyTheme(theme: ThemeMode, systemTheme: ResolvedTheme) {
  const resolvedTheme = resolveTheme(theme, systemTheme);

  document.documentElement.dataset.themeMode = theme;
  document.documentElement.dataset.theme = resolvedTheme;
  document.documentElement.style.colorScheme = resolvedTheme;
  window.localStorage.setItem(themeStorageKey, theme);

  return resolvedTheme;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => getThemeFromDom());
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    getResolvedThemeFromDom(),
  );

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const syncTheme = (nextTheme: ThemeMode) => {
      const nextResolvedTheme = applyTheme(
        nextTheme,
        getResolvedSystemTheme(media.matches),
      );

      setThemeState(nextTheme);
      setResolvedTheme(nextResolvedTheme);
    };

    syncTheme(theme);

    const handleMediaChange = (event: MediaQueryListEvent) => {
      if (theme !== "system") {
        return;
      }

      const nextResolvedTheme = applyTheme(
        "system",
        getResolvedSystemTheme(event.matches),
      );

      setResolvedTheme(nextResolvedTheme);
    };

    media.addEventListener("change", handleMediaChange);
    return () => media.removeEventListener("change", handleMediaChange);
  }, [theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      resolvedTheme,
      setTheme: setThemeState,
    }),
    [resolvedTheme, theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return context;
}

