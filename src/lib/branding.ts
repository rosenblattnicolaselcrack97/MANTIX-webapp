import type { ResolvedTheme } from "@/lib/theme";

export const brandingAssets = {
  full: {
    light: "/branding/mantix-logo-full-light.png",
    dark: "/branding/mantix-logo-full-dark.png",
  },
  mark: {
    light: "/branding/mantix-mark-light.png",
    dark: "/branding/mantix-mark-dark.png",
  },
} as const;

export function getBrandingAsset(
  variant: keyof typeof brandingAssets,
  theme: ResolvedTheme,
) {
  return brandingAssets[variant][theme];
}

export const brandingGuidelines = [
  {
    label: "Logo horizontal principal",
    filename: "mantix-logo-full-light.png / mantix-logo-full-dark.png",
    usage: "Sidebar desktop, cabeceras amplias y materiales institucionales.",
    recommendedSize: "1200 x 300 px PNG transparente",
  },
  {
    label: "Isotipo / versión compacta",
    filename: "mantix-mark-light.png / mantix-mark-dark.png",
    usage: "Sidebar compacta, mobile, atajos visuales y futuros accesos rápidos.",
    recommendedSize: "512 x 512 px PNG transparente",
  },
  {
    label: "Versión pequeña para sidebar",
    filename: "mantix-logo-full-light.png / mantix-logo-full-dark.png",
    usage: "Render habitual dentro de la app con ancho visual controlado.",
    recommendedSize: "240 x 64 px PNG transparente",
  },
  {
    label: "Base para favicon / app icon",
    filename: "mantix-mark-light.png / mantix-mark-dark.png",
    usage: "Conversión posterior a favicon, app icon y PWA assets.",
    recommendedSize: "64 x 64 px y 32 x 32 px",
  },
] as const;

