export const themeStorageKey = "mantix-theme";

export const themeModes = ["light", "dark", "system"] as const;

export type ThemeMode = (typeof themeModes)[number];
export type ResolvedTheme = Exclude<ThemeMode, "system">;

export const themeLabels: Record<ThemeMode, string> = {
  light: "Claro",
  dark: "Oscuro",
  system: "Sistema",
};

export function isThemeMode(value: string | null | undefined): value is ThemeMode {
  return themeModes.includes(value as ThemeMode);
}

export function getResolvedSystemTheme(matchesDark: boolean): ResolvedTheme {
  return matchesDark ? "dark" : "light";
}

export function resolveTheme(
  theme: ThemeMode,
  systemTheme: ResolvedTheme,
): ResolvedTheme {
  return theme === "system" ? systemTheme : theme;
}

