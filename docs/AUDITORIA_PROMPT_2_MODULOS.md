# AUDITORIA PROMPT 2 - MODULOS CENTRALES

Fecha: 2026-05-01
Scope: solo `MANTIX_WEBAPP`

## Que quedo estable del Prompt 1
- Auth base funcionando con Supabase Auth y `AuthContext`.
- Login y signup con flujo server-side para crear/vincular empresa y perfil.
- `user-approved` ya no vuelve a pedir empresa; la empresa activa depende de `profiles.company_id`.
- Sidebar estable y sin contadores falsos hardcodeados en Prompt 1.
- Configuracion de usuario y configuracion base de empresa ya cuentan con API y storage base.
- Superadmin y Mantix admin siguen soportados via `profiles.is_super_admin`, `profiles.is_mantix_admin` y `admin_company_assignments`.

## Tablas que ya existen
- `companies`
- `profiles`
- `locations`
- `assets`
- `providers`
- `work_orders`
- `asset_status_history`
- `wo_status_history`
- `wo_labor`
- `wo_materials`
- `failure_events`
- `maintenance_budget`
- `admin_company_assignments`
- `email_events`
- `email_threads`
- `notification_log`

## Rutas existentes
- Auth: `/auth/login`, `/auth/signup`, `/auth/confirm`, `/auth/user-approved`, `/auth/account-status`, `/auth/update-password`
- Workspace: `/`, `/locations`, `/assets`, `/assets/new`, `/work-orders`, `/work-orders/new`, `/providers`, `/preventive`, `/finance-maintenance`, `/communications-email`, `/settings`, `/users`
- Admin global: `/admin`, `/admin/companies`, `/admin/companies/[id]`, `/admin/users`, `/admin/assets`, `/admin/work-orders`, `/admin/locations`, `/admin/admin-settings`
- APIs criticas: `/api/auth/signup`, `/api/company/settings`, `/api/company/users`, `/api/email/inbound`, `/api/csv/import`

## Modulos incompletos o en compatibilidad
- `locations`: existia solo lectura de `locations`, sin areas ni gestion completa.
- `providers`: existia lectura basica de `providers`, sin contactos multiples, relaciones ni busqueda avanzada.
- `assets`: alta manual parcial y listado basico; faltan area, responsable, documentos y relacion madura con proveedores.
- `work_orders`: listado basico y pagina nueva, pero sin calendario operativo ni multi-proveedor.
- `preventive`, `finance-maintenance`, `communications-email`: todavia en empty state o implementacion parcial.
- `src/features/**` todavia contiene servicios con mocks en dashboard, reportes, mensajes, activos y proveedores legacy.

## Mock / datos falsos detectados
- `src/data/mock/dashboard.ts`
- `src/data/mock/platform.ts`
- `src/data/mock/parts.ts`
- `src/features/dashboard/services/get-dashboard-data.ts`
- `src/features/work-orders/services/get-work-orders-overview.ts`
- `src/features/messages/services/get-messages-overview.ts`
- `src/features/reports/services/get-reports-overview.ts`

## Migraciones previas detectadas
- `20260501_001_user_profile_settings.sql`
- `20260501_002_company_white_label_base.sql`
- `20260501_003_storage_buckets_base.sql`
- `001_email_tables.sql`

## Que migraciones hacen falta antes de avanzar fuerte
- `20260501_004_branches_areas.sql`
- `20260501_005_suppliers_core.sql`
- `20260501_006_assets_core.sql`
- Pendientes siguientes iteraciones: preventivo 10 años, work orders calendario, finanzas, email communications, dashboard reportes.

## Riesgos antes de avanzar
- El naming actual usa `locations`, `providers` y `work_orders`; duplicar con `branches`, `suppliers` o `orders` seria un error. Prompt 2 debe extender, no duplicar.
- Hay modulos del workspace conectados directo a Supabase y otros todavia usando mocks; mezclar ambos sin migracion ordenada puede generar UX inconsistente.
- `CSVImportExport` actual es CSV, no Excel real. Si se expone como solucion final para Prompt 2, queda corto frente al alcance pedido.
- El webhook inbound email aun deja TODOs de procesamiento seguro y sincronizacion con entidades.
- Las nuevas relaciones multi-tenant deben sostener `company_id` en tablas y politicas, no solo en frontend.