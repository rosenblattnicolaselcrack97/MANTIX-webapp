# MANTIX Webapp

Frontend inicial profesional de MANTIX, pensado como base web-first para gestión de mantenimiento en PyMEs de LATAM.

## Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Componentes locales estilo `shadcn/ui`
- `lucide-react`
- ESLint
- Prettier

## Qué incluye esta etapa

- Dashboard principal con layout `sidebar + topbar + content`
- Branding Mantix integrado en el shell de la app
- Tarjetas KPI
- Tabla de órdenes recientes
- Panel de activos con alertas
- Actividad reciente
- Rutas base para:
  - dashboard
  - órdenes de trabajo
  - activos
  - proveedores
  - mensajes
  - reportes
  - configuración
- Mock data separada de la UI
- Tipos base para entidades principales
- Capa simple de servicios lista para reemplazarse por API real

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run lint:fix
npm run typecheck
npm run format
npm run format:check
```

## Cómo levantar el proyecto

```bash
cd "C:\Users\nicolas\Desktop\PROYECTOS APPS\MANTIX_WEBAPP"
npm install
npm run dev
```

Abrí `http://127.0.0.1:3000`.

## Estructura

```text
src/
  app/
    (workspace)/
  components/
    layout/
    shared/
    ui/
  data/
    mock/
  features/
    assets/
    dashboard/
    messages/
    providers/
    reports/
    settings/
    work-orders/
  lib/
  types/
```

## Dónde tocar cada cosa

- Layout general: `src/components/layout`
- UI reutilizable: `src/components/ui`
- Branding, chips y placeholders compartidos: `src/components/shared`
- Dashboard: `src/features/dashboard`
- Mock data: `src/data/mock`
- Tipos: `src/types/entities.ts`
- Navegación y utilidades: `src/lib`

## Cómo conectar backend después

La idea actual es simple:

1. Los componentes consumen servicios por feature.
2. Los servicios leen mocks locales.
3. Después podés reemplazar esos servicios por llamadas reales a Supabase o a tu API sin reescribir el layout ni las vistas.

Ejemplo:

- Hoy: `src/features/dashboard/services/get-dashboard-data.ts`
- Mañana: ese mismo archivo puede hacer `fetch`, usar SDK de Supabase o combinar varias fuentes reales.

## Próximos pasos sugeridos

1. Conectar autenticación y perfiles con Supabase.
2. Modelar tablas reales para compañías, usuarios, activos y órdenes.
3. Reemplazar los mocks de dashboard por consultas reales.
4. Completar el flujo CRUD de órdenes y activos.
5. Agregar storage para evidencia fotográfica.
