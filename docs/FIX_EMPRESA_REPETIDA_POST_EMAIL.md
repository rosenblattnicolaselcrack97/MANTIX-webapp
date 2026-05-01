# FIX EMPRESA REPETIDA POST EMAIL

Fecha: 2026-05-01

## Causa raiz
- El flujo anterior trataba `profile === null` como falta de empresa y mandaba a `/setup`.
- Ese fallback estaba repetido en login, confirm y guardas privadas.
- Si Supabase tardaba en devolver el perfil, el usuario podia volver a ver onboarding aun con `profiles.company_id` cargado.

## Archivos modificados
- `src/lib/access-state.ts`
- `src/components/auth/ProtectedRoute.tsx`
- `src/app/auth/login/page.tsx`
- `src/app/auth/confirm/page.tsx`
- `src/app/setup/page.tsx`
- `src/app/auth/account-status/page.tsx`
- `src/app/auth/user-approved/page.tsx`

## Flujo corregido
- `/auth/confirm` procesa `code` o `token_hash`.
- Luego calcula estado con `resolveAccessState`.
- `ready` va a `/auth/user-approved` y luego login/dashboard.
- `pending`, `no_company` e `incomplete_profile` van a `/auth/account-status`.
- `/setup` ya no abre onboarding; solo redirige segun estado.

## Pruebas manuales
- Usuario aprobado: `is_active=true`, `company_id` valido, confirmar email, login y verificar que entra a `/` sin preguntar empresa.
- Usuario sin empresa: `is_active=true`, `company_id=null`, login y verificar `/auth/account-status?state=no_company`.
- Usuario pendiente: `is_active=false`, login y verificar `/auth/account-status?state=pending`.
- Admin empresa: `role=admin|manager|admin_empresa|company_admin`, `company_id` valido, debe entrar al workspace y ver `Usuarios`.
