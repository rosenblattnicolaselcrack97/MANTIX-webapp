import { themeStorageKey, type ThemeMode } from "@/lib/theme";

function getThemeInitScript() {
  const defaultTheme: ThemeMode = "system";

  return `
    (function() {
      var storageKey = "${themeStorageKey}";
      var defaultTheme = "${defaultTheme}";
      var root = document.documentElement;
      var storedTheme = window.localStorage.getItem(storageKey);
      var theme = storedTheme === "light" || storedTheme === "dark" || storedTheme === "system"
        ? storedTheme
        : defaultTheme;
      var systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      var resolvedTheme = theme === "system" ? systemTheme : theme;

      root.dataset.themeMode = theme;
      root.dataset.theme = resolvedTheme;
      root.style.colorScheme = resolvedTheme;
    })();
  `;
}

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: getThemeInitScript() }} />;
}
