# AUDITORIA PROMPT 1 - ESTABILIZACION BASE

Fecha: 2026-05-01
Scope: solo `MANTIX_WEBAPP`

## Stack real
- Next.js 16.2.4 con App Router en `src/app`.
- React 19, TypeScript, Tailwind v4/CSS global y componentes internos.
- Supabase Auth, Database y Storage.
- Cliente anon frontend en `src/lib/supabase.ts`.
- Cliente service role solo server-side en `src/lib/supabase-admin.ts`.
- Deploy esperado: Vercel.

## Auth y usuario
- Login: `src/app/auth/login/page.tsx` usa `AuthContext.signIn`.
- Signup: `src/app/auth/signup/page.tsx` delega en `POST /api/auth/signup`, que usa service role, crea/repara `auth.users`, crea/vincula `companies` y hace upsert de `profiles`.
- Confirmacion/invitacion/reset: Supabase redirige a `/auth/confirm`; esa pagina procesa `code` o `token_hash` y despues redirige segun estado.
- Password reset: `/auth/forgot-password` envia el link y `/auth/update-password` actualiza la password solo con sesion recovery valida.

## Empresa activa y permisos
- La empresa activa sale de `profiles.company_id`; no existe tabla `company_memberships` en Prompt 1.
- `WorkspaceShell` carga `companies` por `profile.company_id`.
- Roles globales: `profiles.is_super_admin` y `profiles.is_mantix_admin`.
- Admin empresa: `profiles.role` normalizado por `isCompanyAdminRole` (`admin`, `manager`, `admin_empresa`, `company_admin`).
- Usuario normal: profile activo con `company_id`, sin flags admin global.

## Causa del bug empresa repetida
- Antes, varios puntos usaban fallback a `/setup` cuando `profile` era `null` o no tenia `company_id`.
- Si el perfil tardaba en cargar, un usuario ya asignado podia caer en onboarding y volver a ver pregunta de empresa.
- Ahora `resolveAccessState` centraliza: `admin`, `ready`, `pending`, `no_company`, `incomplete_profile`, `unauthenticated`.
- `/setup` quedo como ruta legacy segura: no pide empresa, solo redirige al estado correcto.

## Archivos criticos
- `src/contexts/AuthContext.tsx`
- `src/lib/access-state.ts`
- `src/components/auth/ProtectedRoute.tsx`
- `src/app/auth/confirm/page.tsx`
- `src/app/auth/account-status/page.tsx`
- `src/app/auth/user-approved/page.tsx`
- `src/components/layout/workspace-shell.tsx`
- `src/components/layout/app-sidebar.tsx`
- `src/app/(workspace)/settings/page.tsx`
- `src/app/(workspace)/users/page.tsx`
- `src/app/api/company/users/**`
- `src/app/api/company/settings/route.ts`

## Tablas involucradas
- `auth.users`
- `public.profiles`
- `public.companies`
- `public.admin_company_assignments`
- `public.email_events`
- `storage.buckets`
- `storage.objects`

## Bugs y riesgos encontrados
- `src/types/lucide-react.d.ts` tapaba los tipos reales de lucide y rompia `typecheck`; fue eliminado.
- `getPageMeta` mostraba `Orden #2847` hardcodeada; fue reemplazado por texto generico.
- APIs de usuarios de empresa permitian bypass de admin global; ahora requieren admin de la propia empresa.
- Settings de empresa cargaba solo `id/name/logo` y podia guardar defaults sobre campos reales; ahora carga detalle desde API antes de guardar.
- Storage tenia politicas de upload demasiado amplias; la migracion ahora las reemplaza por reglas scoped.
- Persisten modulos legacy con mocks en `src/features/**` y `src/data/mock/**`, pero no se conectan al flujo estabilizado del Prompt 1.

## Modificado en esta pasada
- Auth callback robusto para `code` y `token_hash`.
- Estados claros para pendiente, sin empresa e inconsistencia.
- Pagina profesional `/auth/user-approved`.
- Settings usuario/empresa y usuarios de empresa.
- Sidebar sin contadores falsos, colapsable y con rutas coming soon.
- Templates de email Supabase con `{{ .ConfirmationURL }}`.
- Migraciones no destructivas y documentacion de testing.
