import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Boxes,
  ClipboardList,
  Building2,
  LayoutGrid,
  Settings2,
  UserRound,
  Users,
  Truck,
  Tag,
} from "lucide-react";

export interface NavigationItem {
  id: string;
  title: string;
  href: string;
  icon: LucideIcon;
}

export interface NavigationSection {
  label: string;
  items: NavigationItem[];
}

export function buildNavigationSections(isCompanyAdmin: boolean): NavigationSection[] {
  return [
    {
      label: "Principal",
      items: [
        {
          id: "resumen",
          title: "Resumen",
          href: "/",
          icon: LayoutGrid,
        },
        {
          id: "branches",
          title: "Sucursales",
          href: "/locations",
          icon: Building2,
        },
        {
          id: "assets",
          title: "Inventario Físico",
          href: "/assets",
          icon: Boxes,
        },
        {
          id: "providers",
          title: "Proveedores",
          href: "/providers",
          icon: Truck,
        },
        {
          id: "work-orders",
          title: "Órdenes de trabajo",
          href: "/work-orders",
          icon: ClipboardList,
        },
      ],
    },
    {
      label: "Gestión",
      items: [
        {
          id: "parts",
          title: "Stock y repuestos",
          href: "/parts",
          icon: BarChart3,
        },
        {
          id: "categorias",
          title: "Categorías",
          href: "/categorias",
          icon: Tag,
        },
      ],
    },
    {
      label: "Configuración",
      items: [
        {
          id: "settings",
          title: "Configuración General",
          href: "/settings",
          icon: Settings2,
        },
        ...(isCompanyAdmin
          ? [
              {
                id: "users",
                title: "Usuarios",
                href: "/users",
                icon: Users,
              },
            ]
          : []),
        {
          id: "account",
          title: "Cuenta (Próximamente)",
          href: "/account",
          icon: UserRound,
        },
      ],
    },
  ];
}

const pageMeta = {
  "/": {
    title: "Resumen",
    subtitle: "KPIs operativos reales de tu empresa",
  },
  "/work-orders": {
    title: "Órdenes de Trabajo",
    subtitle: "Gestión y seguimiento de intervenciones",
  },
  "/work-orders/new": {
    title: "Nueva Orden de Trabajo",
    subtitle: "Completá los datos para registrar la intervención",
  },
  "/assets": {
    title: "Inventario Físico",
    subtitle: "Activos, componentes, repuestos, herramientas e instalaciones",
  },
  "/assets/new": {
    title: "Registrar Nuevo Activo",
    subtitle: "Completá la información del equipo para agregarlo al sistema",
  },
  "/providers": {
    title: "Proveedores",
    subtitle: "CRM operativo de proveedores y contactos",
  },
  "/locations": {
    title: "Sucursales",
    subtitle: "Sedes activas de operación",
  },
  "/reports": {
    title: "Reportes (Próximamente)",
    subtitle: "Módulo fuera de alcance del MVP Fase 1/2",
  },
  "/preventive": {
    title: "Mantenimiento Preventivo (Próximamente)",
    subtitle: "Módulo fuera de alcance del MVP Fase 1/2",
  },
  "/parts": {
    title: "Stock y Repuestos",
    subtitle: "Inventario técnico y alertas de reposición",
  },
  "/automatizaciones": {
    title: "Automatizaciones (Próximamente)",
    subtitle: "Módulo fuera de alcance del MVP Fase 1/2",
  },
  "/categorias": {
    title: "Categorías",
    subtitle: "Clasificación de activos, órdenes y repuestos",
  },
  "/finance-maintenance": {
    title: "Análisis Financiero (Próximamente)",
    subtitle: "Módulo fuera de alcance del MVP Fase 1/2",
  },
  "/communications-email": {
    title: "Comunicaciones (Próximamente)",
    subtitle: "Email y canales externos quedan fuera del MVP Fase 1/2",
  },
  "/settings": {
    title: "Configuración",
    subtitle: "Ajustes de tu espacio en Mantix",
  },
  "/users": {
    title: "Usuarios",
    subtitle: "Gestión de usuarios de empresa",
  },
  "/account": {
    title: "Mi Cuenta",
    subtitle: "Resumen de tu cuenta y acceso",
  },
} as const;

export function getPageMeta(pathname: string) {
  if (pathname.startsWith("/work-orders/") && pathname !== "/work-orders/new") {
    return {
      title: "Detalle de Orden",
      subtitle: "Seguimiento de la orden de trabajo",
    };
  }

  return pageMeta[pathname as keyof typeof pageMeta] ?? pageMeta["/"];
}
