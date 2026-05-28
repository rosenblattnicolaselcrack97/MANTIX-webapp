# EMAIL CUENTA APROBADA PROFESIONAL

## Como funciona hoy
- El signup usa un link real de verificacion y redirige a `/auth/usercheck`.
- El recovery redirige a `/auth/newpass`.
- Si usas un proveedor custom de email, el HTML corto se arma desde la app y el boton debe apuntar al link de verificacion generado.

## Templates creados
- `docs/email-templates/account-approved.html`
- `docs/email-templates/account-approved.txt`
- `docs/email-templates/password-recovery.html`
- `docs/email-templates/password-recovery.txt`

## URL del boton
- Usar el link de verificacion generado por el flujo de signup.
- En Supabase, configurar Redirect URL permitida: `https://mantixarg.com/auth/usercheck`.
- El flujo esperado es email -> link de verificacion -> `/auth/usercheck` -> `/` o `/admin`.

## Configurar en Supabase
1. Dashboard de Supabase.
2. Authentication -> Email Templates.
3. Editar Confirm signup o Invite user segun el flujo usado.
4. Copiar HTML desde `docs/email-templates/account-approved.html`.
5. Copiar texto plano desde `docs/email-templates/account-approved.txt`.
6. Authentication -> URL Configuration:
   - Site URL: `https://mantixarg.com`
   - Redirect URLs: `https://mantixarg.com/auth/usercheck`

## Configurar en Vercel
- `NEXT_PUBLIC_SITE_URL=https://mantixarg.com`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` solo server-side.

## Prueba
- Enviar confirmacion/invitacion.
- Abrir el CTA.
- Verificar que el flujo llega a `/auth/usercheck`.
- Verificar llegada a `/auth/usercheck`.
