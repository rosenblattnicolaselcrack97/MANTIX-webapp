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
- Confirmacion/verificacion: el signup redirige a `/auth/usercheck`; esa pagina valida el estado y luego deriva segun rol o acceso.
- Password reset: `/auth/forgot-password` envia el link y `/auth/newpass` actualiza la password solo con sesion recovery valida.

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
- `src/app/auth/usercheck/page.tsx`
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
- Templates de email cortos con link de verificacion generado por la app.
- Migraciones no destructivas y documentacion de testing.

## Diagnostico actual de auth
- Rutas existentes hoy: `/auth/login`, `/auth/signup`, `/auth/forgot-password`, `/auth/newuser`, `/auth/newpass`, `/auth/usercheck`, `/auth/user-approved`, `/auth/account-status`.
- La pagina de login ya quedo reducida a un formulario centrado con redireccion automatica para usuarios autenticados.
- Todavia falta alinear los nombres nuevos pedidos por producto: `/auth/newuser`, `/auth/newpass` y `/auth/usercheck`.
- El flujo de alta de empresa sigue concentrado en `/auth/signup`; hay que verificar que el alta de empresa siga creando o vinculando `company_id` correctamente antes de mover la ruta definitiva.
- El flujo de recovery ya sale por `/auth/forgot-password` y vuelve por `/auth/newpass`.

## Avance de auth en esta pasada
- `/auth/newuser` ya existe como alias de la pagina de signup.
- `/auth/newpass` ya existe como alias de la pagina de recovery.
- `/auth/usercheck` ya existe como pantalla de confirmacion con redireccion automatica.
- El login ahora apunta a `/auth/newuser` para respetar el dominio pedido por producto.
- El recovery ahora redirige a `/auth/newpass`.
- El alta de usuario genera un link real de Supabase para verificacion, envia un mail corto con logo de Mantix y redirige a `/auth/usercheck` tras confirmar.

## Siguientes pasos ya dejados listos
- Revisar en Supabase `Site URL` y `Redirect URLs` con `https://mantixarg.com`, `https://mantixarg.com/auth/usercheck` y `https://mantixarg.com/auth/newpass`.
- Pegar el HTML corto de verificacion en los templates de email que uses para signup/invite, manteniendo el link de verificacion.
- Revisar usuarios fantasma con `supabase/ghost_user_candidates.sql` y purgarlos con `/api/debug/signup-check` solo si cumplen la ventana de 48 horas sin confirmar.
- Si querés automatizar la limpieza, el siguiente paso es envolver la misma lógica del debug route en una Edge Function programada.

## Que tenes que hacer vos
- Entrar a Supabase y dejar configurado `NEXT_PUBLIC_SITE_URL` como `https://mantixarg.com`.
- Permitir como redirect URLs solo `https://mantixarg.com/auth/usercheck` y `https://mantixarg.com/auth/newpass`.
- Pegar el contenido de verificacion corto en los templates de email de Supabase o en el proveedor que uses.
- Abrir `supabase/ghost_user_candidates.sql` y revisar si aparecen cuentas huérfanas viejas antes de borrar nada.
- Si querés limpieza manual, usar `DELETE /api/debug/signup-check` solo con IDs que ya pasaron la ventana de 48 horas y siguen sin confirmar.
- Hacer un alta de prueba, confirmar el mail, probar login, probar recovery y verificar que no vuelva a pedir empresa.

## Siguiente paso natural
- Cuando eso esté validado, el paso siguiente es automatizar la limpieza de ghost users en una Edge Function o un cron de Supabase, reutilizando la misma regla de 48 horas sin confirmar.
