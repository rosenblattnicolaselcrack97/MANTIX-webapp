import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { ThemeScript } from "@/components/theme/theme-script";

export const metadata: Metadata = {
  title: {
    default: "Mantix | Webapp de mantenimiento para PyMEs",
    template: "%s | Mantix",
  },
  description:
    "Frontend inicial profesional de Mantix para gestión de mantenimiento, activos, órdenes de trabajo y coordinación operativa.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
