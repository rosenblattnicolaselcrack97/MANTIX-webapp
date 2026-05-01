import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Boxes,
  ClipboardList,
  Building2,
  LayoutGrid,
  Mail,
  PiggyBank,
  ShieldCheck,
  Settings2,
  UserRound,
  Users,
  Truck,
  Tag,
  Zap,
  LineChart,
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
          id: "dashboard",
          title: "Dashboard",
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
          title: "Activos",
          href: "/assets",
          icon: Boxes,
        },
        {
          id: "work-orders",
          title: "Órdenes de trabajo",
          href: "/work-orders",
          icon: ClipboardList,
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
      label: "Gestión",
      items: [
        {
          id: "parts",
          title: "Stock y repuestos",
          href: "/parts",
          icon: BarChart3,
        },
        {
          id: "preventive",
          title: "Preventivo",
          href: "/preventive",
          icon: ShieldCheck,
        },
        {
          id: "automatizaciones",
          title: "Automatizaciones",
          href: "/automatizaciones",
          icon: Zap,
        },
        {
          id: "categorias",
          title: "Categorías",
          href: "/categorias",
          icon: Tag,
        },
        {
          id: "reports",
          title: "Reportes",
          href: "/reports",
          icon: LineChart,
        },
        {
          id: "finance",
          title: "Finanzas",
          href: "/finance-maintenance",
          icon: PiggyBank,
        },
        {
          id: "email-comms",
          title: "Comunicaciones",
          href: "/communications-email",
          icon: Mail,
        },
      ],
    },
    {
      label: "Configuración",
      items: [
        {
          id: "settings",
          title: "Configuración",
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
          title: "Cuenta",
          href: "/account",
          icon: UserRound,
        },
      ],
    },
  ];
}

const pageMeta = {
  "/": {
    title: "Dashboard",
    subtitle: "Resumen operativo de tu empresa",
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
    title: "Activos",
    subtitle: "Inventario y estado de equipos",
  },
  "/assets/new": {
    title: "Registrar Nuevo Activo",
    subtitle: "Completá la información del equipo para agregarlo al sistema",
  },
  "/providers": {
    title: "Proveedores y Técnicos Externos",
    subtitle: "Directorio de contactos de mantenimiento",
  },
  "/locations": {
    title: "Sucursales",
    subtitle: "Sedes activas de operación",
  },
  "/reports": {
    title: "Reportes y Análisis",
    subtitle: "Métricas e indicadores operativos",
  },
  "/preventive": {
    title: "Mantenimiento Preventivo",
    subtitle: "Rutinas y programas de mantenimiento",
  },
  "/parts": {
    title: "Stock y Repuestos",
    subtitle: "Inventario técnico y alertas de reposición",
  },
  "/automatizaciones": {
    title: "Automatizaciones",
    subtitle: "Reglas automáticas basadas en eventos del sistema",
  },
  "/categorias": {
    title: "Categorías",
    subtitle: "Clasificación de activos, órdenes y repuestos",
  },
  "/finance-maintenance": {
    title: "Finanzas del mantenimiento",
    subtitle: "Costos y presupuestos de intervenciones",
  },
  "/communications-email": {
    title: "Comunicaciones por email",
    subtitle: "Configuración de notificaciones y plantillas",
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
