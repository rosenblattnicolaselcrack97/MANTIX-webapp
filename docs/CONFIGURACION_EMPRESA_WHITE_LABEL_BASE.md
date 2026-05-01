# CONFIGURACION EMPRESA WHITE LABEL BASE

## Ruta
- `/settings`, tab `Empresa`

## Permisos
- Visible/editable solo para admin empresa.
- API `GET/PATCH /api/company/settings` requiere usuario autenticado, activo, con `company_id` y rol admin empresa.
- Superadmin global no bypassa endpoints de empresa.

## Campos
- `name`
- `description`
- `logo_url`
- `theme_mode`
- `primary_color`
- `secondary_color`
- `font_family`
- `font_size`
- `email_cc_admin`
- `email_template_header`
- `email_template_footer`

## Implementacion
- La UI carga primero empresa asignada para mostrar nombre.
- Si el usuario es admin empresa, carga settings completos desde `/api/company/settings`.
- El guardado se hace server-side con service role y validacion de permisos.
- Si no hay logo, la app conserva branding Mantix.

## SQL
- Ejecutar `supabase/migrations/20260501_002_company_white_label_base.sql`.
- Ejecutar `supabase/migrations/20260501_003_storage_buckets_base.sql` para logos.
