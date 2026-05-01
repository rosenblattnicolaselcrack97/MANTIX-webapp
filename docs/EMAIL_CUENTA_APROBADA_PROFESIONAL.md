# EMAIL CUENTA APROBADA PROFESIONAL

## Como funciona hoy
- Supabase Auth envia los emails de confirmacion/invitacion/reset.
- En esta pasada no se agrego proveedor custom porque `.env.local` no tiene Resend/Postmark/SendGrid.
- La app procesa el link en `/auth/confirm` y deriva a `/auth/user-approved` si el usuario esta listo.

## Templates creados
- `docs/email-templates/account-approved.html`
- `docs/email-templates/account-approved.txt`

## URL del boton
- Usar `{{ .ConfirmationURL }}` en el template.
- En Supabase, configurar Redirect URL permitida: `https://mantixarg.com/auth/confirm`.
- El flujo esperado es email -> Supabase token -> `/auth/confirm` -> `/auth/user-approved`.

## Configurar en Supabase
1. Dashboard de Supabase.
2. Authentication -> Email Templates.
3. Editar Confirm signup o Invite user segun el flujo usado.
4. Copiar HTML desde `docs/email-templates/account-approved.html`.
5. Copiar texto plano desde `docs/email-templates/account-approved.txt`.
6. Authentication -> URL Configuration:
   - Site URL: `https://mantixarg.com`
   - Redirect URLs: `https://mantixarg.com/auth/confirm`

## Configurar en Vercel
- `NEXT_PUBLIC_SITE_URL=https://mantixarg.com`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` solo server-side.

## Prueba
- Enviar confirmacion/invitacion.
- Abrir el CTA.
- Verificar que el token se procesa en `/auth/confirm`.
- Verificar llegada a `/auth/user-approved`.
