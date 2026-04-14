import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Boxes,
  ClipboardList,
  Cog,
  LayoutGrid,
  MessageSquareMore,
  Settings2,
  ShieldCheck,
  Truck,
  Wrench,
} from "lucide-react";

export interface NavigationItem {
  id: string;
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
}

export interface NavigationSection {
  label: string;
  items: NavigationItem[];
}

export const navigationSections: NavigationSection[] = [
  {
    label: "Principal",
    items: [
      {
        id: "dashboard",
        title: "Dashboard",
        href: "/",
        icon: LayoutGrid,
      },
      {
        id: "work-orders",
        title: "Ordenes de trabajo",
        href: "/work-orders",
        icon: ClipboardList,
        badge: "15",
      },
      {
        id: "assets",
        title: "Activos",
        href: "/assets",
        icon: Boxes,
        badge: "32",
      },
      {
        id: "providers",
        title: "Proveedores",
        href: "/providers",
        icon: Truck,
      },
    ],
  },
  {
    label: "Gestion",
    items: [
      {
        id: "reports",
        title: "Reportes",
        href: "/reports",
        icon: BarChart3,
      },
      {
        id: "parts",
        title: "Stock y Repuestos",
        href: "/parts",
        icon: Cog,
      },
      {
        id: "preventive",
        title: "Preventivo",
        href: "/preventive",
        icon: ShieldCheck,
      },
      {
        id: "messages",
        title: "Mensajes",
        href: "/messages",
        icon: MessageSquareMore,
        badge: "3",
      },
      {
        id: "branches",
        title: "Sucursales",
        href: "/settings",
        icon: Wrench,
      },
    ],
  },
  {
    label: "Cuenta",
    items: [
      {
        id: "settings",
        title: "Configuracion",
        href: "/settings",
        icon: Settings2,
      },
    ],
  },
];

const pageMeta = {
  "/": {
    title: "Dashboard",
    subtitle: "Buenos dias, Juan",
  },
  "/work-orders": {
    title: "Ordenes de Trabajo",
    subtitle: "15 activas · 3 urgentes sin asignar",
  },
  "/work-orders/new": {
    title: "Nueva Orden de Trabajo",
    subtitle: "Completa los datos para registrar la intervencion",
  },
  "/assets": {
    title: "Activos",
    subtitle: "32 equipos registrados · 5 con alertas",
  },
  "/assets/new": {
    title: "Registrar Nuevo Activo",
    subtitle: "Completa la informacion del equipo para agregarlo al sistema",
  },
  "/providers": {
    title: "Proveedores y Tecnicos Externos",
    subtitle: "12 contactos registrados",
  },
  "/messages": {
    title: "Mensajes",
    subtitle: "3 sin leer",
  },
  "/reports": {
    title: "Reportes y Analisis",
    subtitle: "Metricas · Marzo 2026",
  },
  "/preventive": {
    title: "Preventivo",
    subtitle: "Rutinas para mantenimiento anexo y operativo",
  },
  "/parts": {
    title: "Stock y Repuestos",
    subtitle: "Inventario operativo y reposicion",
  },
  "/settings": {
    title: "Configuracion",
    subtitle: "Ajustes de tu espacio en Mantix",
  },
} as const;

export function getPageMeta(pathname: string) {
  if (pathname.startsWith("/work-orders/") && pathname !== "/work-orders/new") {
    return {
      title: "Detalle de Orden",
      subtitle: "Orden #2847",
    };
  }

  return pageMeta[pathname as keyof typeof pageMeta] ?? pageMeta["/"];
}
