# FLUJO PASSWORD RESET

## Rutas
- `/auth/forgot-password`
- `/auth/update-password`
- `/auth/confirm`

## Flujo
1. Usuario ingresa email en `/auth/forgot-password`.
2. Supabase envia link de recovery.
3. Link vuelve a `/auth/update-password` o pasa por `/auth/confirm` si Supabase incluye token/callback.
4. `/auth/update-password` valida que exista sesion recovery.
5. Usuario ingresa nueva password.
6. Supabase actualiza password.
7. Se muestra exito y redirige a `/auth/login`.

## Estados cubiertos
- Email vacio.
- Link invalido o vencido.
- Password menor a 8 caracteres.
- Passwords no coinciden.
- Error Supabase traducido a texto claro.

## Variables
- `NEXT_PUBLIC_SITE_URL=https://mantixarg.com`
- Redirect URL permitida: `https://mantixarg.com/auth/update-password`
