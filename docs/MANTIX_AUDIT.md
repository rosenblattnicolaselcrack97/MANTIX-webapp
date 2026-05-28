# MANTIX Audit (May 2026)

## 1. Stack detectado
- Framework: Next.js 16 (App Router)
- Frontend: React 19 + TypeScript
- Estilos: Tailwind CSS v4 + componentes UI propios
- Backend BaaS: Supabase (`@supabase/supabase-js`)
- Deploy: Vercel
- Runtime esperado: Node 20

## 2. Estructura actual relevante
- `src/app/(workspace)` contiene los módulos operativos principales.
- `src/app/admin` contiene panel admin/super admin.
- `src/app/api` contiene rutas server para signup, usuarios, settings, setup y CSV.
- `src/lib/supabase.ts` cliente web Supabase.
- `src/lib/supabase-admin.ts` cliente server con `SUPABASE_SERVICE_ROLE_KEY`.
- `supabase/` contiene schema y migraciones legacy + scripts admin.

## 3. Rutas actuales
- Workspace: `/`, `/locations`, `/providers`, `/assets`, `/work-orders`, `/parts`, `/categorias`, `/settings`, `/users`, más rutas fuera de alcance MVP (`/messages`, `/reports`, `/preventive`, `/communications-email`, `/finance-maintenance`, `/automatizaciones`).
- Auth: `/auth/login`, `/auth/signup`, `/auth/newuser`, `/auth/newpass`, `/auth/usercheck`, etc.
- Admin: `/admin`, `/admin/companies`, `/admin/users` y módulos de soporte.

## 4. Estado real Supabase
- Auth: login/signup funcional con ruta server `POST /api/auth/signup`.
- Multiempresa: en funcionamiento vía `profiles.company_id` + filtros por `company_id`.
- RLS: existe en SQL legacy, pero con mezcla de criterios (por tabla y por rol) y naming inconsistente.
- Cliente server-admin ya implementado para operaciones privilegiadas.

## 5. Variables de entorno detectadas
- Públicas:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Server:
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `NEXT_PUBLIC_SITE_URL` (usada para redirects/invitaciones)

## 6. SQL y migraciones existentes (resumen)
- `supabase/schema.sql`: esquema base legacy (companies, profiles, locations, assets, providers, work_orders, etc.).
- `supabase/schema-completo.sql`: snapshot ampliado con módulos extra (incluye email y otras tablas).
- `supabase/admin-setup.sql`: funciones helper RLS y políticas admin.
- `supabase/migrations/20260501_001..006_*`: mejoras incrementales (profiles settings, white-label, storage, branch_areas, suppliers core, assets core).
- `supabase/migrations/001_email_tables.sql`: tablas de email/notificaciones (fuera de alcance MVP actual).

## 7. Mocks encontrados
Persisten servicios basados en `src/data/mock/*` en:
- `src/features/dashboard/services/get-dashboard-data.ts`
- `src/features/assets/services/get-assets-overview.ts`
- `src/features/providers/services/get-providers-overview.ts`
- `src/features/work-orders/services/get-work-orders-overview.ts`
- `src/features/work-orders/services/get-work-order-detail.ts`
- `src/features/messages/services/get-messages-overview.ts`
- `src/features/reports/services/get-reports-overview.ts`
- `src/features/parts/services/get-parts-overview.ts`
- `src/features/settings/components/settings-workspace.tsx`

Nota: varias pantallas operativas ya usan Supabase real directamente, pero quedaron servicios mock legacy sin limpiar.

## 8. Qué conservar
- Base Next.js App Router actual.
- AuthContext actual (ya delegado a API server).
- Cliente Supabase y Supabase Admin.
- Módulos reales existentes para locations/providers/assets/work-orders/parts como base de transición.
- API de usuarios y settings de empresa.

## 9. Qué transformar para MVP Fase 1/2
- Definir esquema MVP unificado con tablas objetivo:
  - `company_members`, `company_settings`
  - `locations` jerárquico
  - `categories` por `scope`
  - `suppliers`, `supplier_contacts`, `supplier_documents`
  - `physical_inventory` + tablas de relación
  - `work_orders` + `wo_tasks`, `wo_parts`, `wo_labor`, `wo_attachments`
  - `warehouses`, `stock_levels`, `stock_movements`, `stock_lots`, `purchase_orders`, `po_items`
- Implementar RLS consistente por membresía activa de empresa.
- Reducir exposición de módulos fuera de alcance en sidebar.
- Eliminar dependencias mock activas de la navegación principal.

## 10. Qué dejar fuera (según alcance)
- Email/comunicaciones externas/inbound/WhatsApp/Telegram.
- IA y automatizaciones avanzadas.
- Reporting avanzado/finanzas premium.
- Billing real.
- Gantt/calendario avanzados.
- Planos/canvas/OCR/webhooks externos.

## 11. Riesgos
- Convivencia temporal entre tablas legacy (`assets/providers/parts`) y nuevas tablas MVP.
- Posibles desalineaciones de roles legacy vs roles objetivo.
- Si no se ejecutan migraciones y RLS en orden, parte de UI podría quedar en modo degradado.

## 12. Plan de transformación resumido
1. Crear migraciones MVP canónicas y runbook de ejecución seguro.
2. Activar/ajustar RLS por `company_members`.
3. Ajustar navegación al alcance Fase 1/2 y dejar placeholders seguros.
4. Conectar UI principal a tablas MVP (con fallback controlado para compatibilidad inicial).
5. Quitar dependencias mock de runtime productivo.
6. Validar build/lint/typecheck y preparar deploy Vercel.
