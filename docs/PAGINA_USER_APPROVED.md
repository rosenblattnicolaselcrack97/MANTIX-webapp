# PAGINA USER APPROVED

## Ruta
- `/auth/user-approved`

## Objetivo
- Mostrar una confirmacion profesional despues de que Supabase procesa confirmacion o invitacion.
- No dispara onboarding de empresa.
- Si existe sesion valida, permite ir al dashboard; si no, invita a ir al login.

## Comportamiento
- Muestra logo Mantix, badge "Cuenta aprobada", titulo "Usuario nuevo aprobado" y CTA a `/auth/login`.
- Carga empresa desde `profiles.company_id` cuando hay sesion.
- Si no puede cargar empresa, muestra empty/error state sin bloquear al usuario.
- Redirige automaticamente a `/auth/login` luego de unos segundos.

## Archivos
- `src/app/auth/user-approved/page.tsx`
- `src/app/auth/confirm/page.tsx`

## Prueba
- Confirmar usuario con empresa.
- Ver `/auth/user-approved`.
- Ver empresa asignada cuando hay sesion.
- Confirmar CTA dashboard si el estado es `ready` o `admin`.
