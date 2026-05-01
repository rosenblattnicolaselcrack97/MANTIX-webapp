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
          title: "Ordenes de trabajo",
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
      label: "Gestion",
      items: [
        {
          id: "parts",
          title: "Stock y repuestos",
          href: "/parts",
          icon: BarChart3,
        },
        {
          id: "preventive",
          title: "Mantenimiento preventivo",
          href: "/preventive",
          icon: ShieldCheck,
        },
        {
          id: "finance",
          title: "Finanzas del mantenimiento",
          href: "/finance-maintenance",
          icon: PiggyBank,
        },
        {
          id: "email-comms",
          title: "Comunicaciones por email",
          href: "/communications-email",
          icon: Mail,
        },
      ],
    },
    {
      label: "Configuracion",
      items: [
        {
          id: "settings",
          title: "Configuracion",
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
    title: "Ordenes de Trabajo",
    subtitle: "Gestion y seguimiento de intervenciones",
  },
  "/work-orders/new": {
    title: "Nueva Orden de Trabajo",
    subtitle: "Completa los datos para registrar la intervencion",
  },
  "/assets": {
    title: "Activos",
    subtitle: "Inventario y estado de equipos",
  },
  "/assets/new": {
    title: "Registrar Nuevo Activo",
    subtitle: "Completa la informacion del equipo para agregarlo al sistema",
  },
  "/providers": {
    title: "Proveedores y Tecnicos Externos",
    subtitle: "Directorio de contactos de mantenimiento",
  },
  "/locations": {
    title: "Sucursales",
    subtitle: "Sedes activas de operacion",
  },
  "/reports": {
    title: "Reportes y Analisis",
    subtitle: "Metricas e indicadores operativos",
  },
  "/preventive": {
    title: "Mantenimiento preventivo",
    subtitle: "Rutinas para mantenimiento programado",
  },
  "/parts": {
    title: "Stock y Repuestos",
    subtitle: "Futuramente disponible",
  },
  "/finance-maintenance": {
    title: "Finanzas del mantenimiento",
    subtitle: "Futuramente disponible",
  },
  "/communications-email": {
    title: "Comunicaciones por email",
    subtitle: "Futuramente disponible",
  },
  "/settings": {
    title: "Configuracion",
    subtitle: "Ajustes de tu espacio en Mantix",
  },
  "/users": {
    title: "Usuarios",
    subtitle: "Gestion de usuarios de empresa",
  },
  "/account": {
    title: "Cuenta",
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
